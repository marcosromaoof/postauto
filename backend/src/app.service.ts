import { Injectable } from '@nestjs/common';
import { QueueService } from './modules/queue';
import { TelegramService } from './modules/telegram';
import { DeepSeekService } from './modules/deepseek';
import { GeminiService } from './modules/gemini';
import { WordPressService } from './modules/wordpress';
import { Post } from './database/entities';

@Injectable()
export class AppService {
  constructor(
    private queueService: QueueService,
    private telegramService: TelegramService,
    private deepSeekService: DeepSeekService,
    private geminiService: GeminiService,
    private wordPressService: WordPressService,
  ) {}

  async initializeCallbacks(): Promise<void> {
    this.telegramService.setOnSubjectCallback(async (subject: string, messageId: string) => {
      await this.queueService.createPost(subject, messageId);
    });

    this.telegramService.setOnApprovalCallback(async (postId: string, action: 'approve' | 'adjust' | 'cancel', data?: string) => {
      switch (action) {
        case 'approve':
          await this.queueService.approvePost(postId);
          break;
        case 'adjust':
          await this.queueService.adjustText(postId, data || '');
          break;
        case 'cancel':
          await this.queueService.cancelPost(postId);
          break;
      }
    });
  }

  async createPost(subject: string): Promise<Post> {
    return this.queueService.createPost(subject);
  }

  async approvePost(postId: string): Promise<Post> {
    return this.queueService.approvePost(postId);
  }

  async cancelPost(postId: string): Promise<Post> {
    return this.queueService.cancelPost(postId);
  }

  async getPost(postId: string): Promise<Post | null> {
    return this.queueService.getPost(postId);
  }

  async getAllPosts(): Promise<Post[]> {
    return this.queueService.getAllPosts();
  }

  async testAllConnections(): Promise<{
    telegram: { success: boolean; message: string };
    deepseek: { success: boolean; message: string };
    gemini: { success: boolean; message: string };
    wordpress: { success: boolean; message: string };
  }> {
    const [telegram, deepseek, gemini, wordpress] = await Promise.all([
      this.telegramService.testConnection(),
      this.deepSeekService.testConnection(),
      this.geminiService.testConnection(),
      this.wordPressService.testConnection(),
    ]);

    return { telegram, deepseek, gemini, wordpress };
  }
}
