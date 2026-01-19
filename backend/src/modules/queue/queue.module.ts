import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { PostProcessor } from './post.processor';
import { Post } from '../../database/entities';
import { DeepSeekModule } from '../deepseek';
import { GeminiModule } from '../gemini';
import { WordPressModule } from '../wordpress';
import { TelegramModule } from '../telegram';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT') || '6379'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'post-processing',
    }),
    TypeOrmModule.forFeature([Post]),
    DeepSeekModule,
    GeminiModule,
    WordPressModule,
    TelegramModule,
  ],
  providers: [QueueService, PostProcessor],
  exports: [QueueService],
})
export class QueueModule {}
