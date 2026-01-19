import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus, LogSource } from '../../database/entities';
import { DeepSeekService } from '../deepseek';
import { GeminiService } from '../gemini';
import { WordPressService } from '../wordpress';
import { TelegramService } from '../telegram';
import { LogsService } from '../logs';
import { JobType } from './queue.service';

@Processor('post-processing')
export class PostProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private deepSeekService: DeepSeekService,
    private geminiService: GeminiService,
    private wordPressService: WordPressService,
    private telegramService: TelegramService,
    private logsService: LogsService,
  ) {
    super();
  }

  async process(job: Job<{ postId: string; adjustments?: string }>): Promise<void> {
    const { postId, adjustments } = job.data;

    switch (job.name) {
      case JobType.GENERATE_TEXT:
        await this.generateText(postId, adjustments);
        break;
      case JobType.GENERATE_IMAGES:
        await this.generateImages(postId);
        break;
      case JobType.PUBLISH_POST:
        await this.publishPost(postId);
        break;
    }
  }

  private async generateText(postId: string, adjustments?: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    try {
      await this.logsService.info(LogSource.SYSTEM, `Iniciando geração de texto para post ${postId}`);

      let subject = post.subject;
      if (adjustments) {
        subject = `${post.subject}\n\nAjustes solicitados: ${adjustments}`;
      }

      const content = await this.deepSeekService.generateContent(subject);

      post.generatedText = content.content;
      post.htmlContent = content.content;
      post.imagePrompts = content.imagePrompts;
      post.tokensUsed = content.tokensUsed;
      post.status = PostStatus.PENDING_APPROVAL;
      post.metadata = {
        ...post.metadata,
        title: content.title,
      };

      await this.postRepository.save(post);

      await this.telegramService.sendApprovalRequest(post);

      await this.logsService.info(LogSource.SYSTEM, `Texto gerado e enviado para aprovação: ${postId}`);
    } catch (error: any) {
      post.status = PostStatus.ERROR;
      post.metadata = {
        ...post.metadata,
        error: error.message,
      };
      await this.postRepository.save(post);

      await this.logsService.error(LogSource.SYSTEM, `Erro ao gerar texto: ${error.message}`, { postId });

      await this.telegramService.sendErrorNotification(post.id, error.message);

      throw error;
    }
  }

  private async generateImages(postId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    try {
      post.status = PostStatus.GENERATING_IMAGES;
      await this.postRepository.save(post);

      await this.logsService.info(LogSource.SYSTEM, `Iniciando geração de imagens para post ${postId}`);

      const images = await this.geminiService.generateImages(post.imagePrompts || []);

      post.generatedImages = images.map((img) => img.localPath);
      post.status = PostStatus.READY;
      await this.postRepository.save(post);

      const queue = (this as any).worker?.queue;
      if (queue) {
        await queue.add(JobType.PUBLISH_POST, { postId });
      }

      await this.logsService.info(LogSource.SYSTEM, `Imagens geradas com sucesso: ${postId}`);
    } catch (error: any) {
      post.status = PostStatus.ERROR;
      post.metadata = {
        ...post.metadata,
        error: error.message,
      };
      await this.postRepository.save(post);

      await this.logsService.error(LogSource.SYSTEM, `Erro ao gerar imagens: ${error.message}`, { postId });

      await this.telegramService.sendErrorNotification(post.id, error.message);

      throw error;
    }
  }

  private async publishPost(postId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    try {
      await this.logsService.info(LogSource.SYSTEM, `Iniciando publicação do post ${postId}`);

      const title = post.metadata?.title || post.subject;
      const images = (post.generatedImages || []).map((path, index) => ({
        localPath: path,
        filename: `image-${index}.png`,
        prompt: post.imagePrompts?.[index] || '',
      }));

      const published = await this.wordPressService.createPost(title, post.htmlContent || '', images);

      post.wordpressPostId = published.id;
      post.wordpressUrl = published.url;
      post.status = PostStatus.PUBLISHED;
      await this.postRepository.save(post);

      await this.telegramService.sendPublishNotification(post, published.url);

      await this.logsService.info(LogSource.SYSTEM, `Post publicado com sucesso: ${published.url}`, { postId });
    } catch (error: any) {
      post.status = PostStatus.ERROR;
      post.metadata = {
        ...post.metadata,
        error: error.message,
      };
      await this.postRepository.save(post);

      await this.logsService.error(LogSource.SYSTEM, `Erro ao publicar post: ${error.message}`, { postId });

      await this.telegramService.sendErrorNotification(post.id, error.message);

      throw error;
    }
  }
}
