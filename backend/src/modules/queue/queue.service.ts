import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from '../../database/entities';

export enum JobType {
  GENERATE_TEXT = 'generate-text',
  GENERATE_IMAGES = 'generate-images',
  PUBLISH_POST = 'publish-post',
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('post-processing')
    private postQueue: Queue,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async createPost(subject: string, telegramMessageId?: string): Promise<Post> {
    const post = this.postRepository.create({
      subject,
      status: PostStatus.PENDING_TEXT,
      telegramMessageId,
    });
    
    const savedPost = await this.postRepository.save(post);

    await this.postQueue.add(JobType.GENERATE_TEXT, {
      postId: savedPost.id,
    });

    return savedPost;
  }

  async approvePost(postId: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    post.status = PostStatus.APPROVED;
    await this.postRepository.save(post);

    await this.postQueue.add(JobType.GENERATE_IMAGES, {
      postId: post.id,
    });

    return post;
  }

  async adjustText(postId: string, adjustments: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    post.metadata = {
      ...post.metadata,
      adjustments,
    };
    post.status = PostStatus.PENDING_TEXT;
    await this.postRepository.save(post);

    await this.postQueue.add(JobType.GENERATE_TEXT, {
      postId: post.id,
      adjustments,
    });

    return post;
  }

  async cancelPost(postId: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post não encontrado');
    }

    post.status = PostStatus.CANCELLED;
    return this.postRepository.save(post);
  }

  async getPost(postId: string): Promise<Post | null> {
    return this.postRepository.findOne({ where: { id: postId } });
  }

  async getPendingApproval(): Promise<Post[]> {
    return this.postRepository.find({
      where: { status: PostStatus.PENDING_APPROVAL },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPosts(limit: number = 50): Promise<Post[]> {
    return this.postRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.postQueue.getWaitingCount(),
      this.postQueue.getActiveCount(),
      this.postQueue.getCompletedCount(),
      this.postQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
