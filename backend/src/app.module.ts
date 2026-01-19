import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth';
import { CredentialsModule } from './modules/credentials';
import { PromptsModule } from './modules/prompts';
import { LimitsModule } from './modules/limits';
import { LogsModule } from './modules/logs/index';
import { MonitoringModule } from './modules/monitoring';
import { DeepSeekModule } from './modules/deepseek';
import { GeminiModule } from './modules/gemini';
import { WordPressModule } from './modules/wordpress';
import { TelegramModule } from './modules/telegram';
import { QueueModule } from './modules/queue';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  Admin,
  Credentials,
  Prompt,
  Limits,
  Usage,
  Log,
  Post,
} from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: parseInt(configService.get('DB_PORT') || '5432'),
        username: configService.get('DB_USERNAME') || 'postauto',
        password: configService.get('DB_PASSWORD') || 'postauto_secret_password',
        database: configService.get('DB_DATABASE') || 'postauto',
        entities: [Admin, Credentials, Prompt, Limits, Usage, Log, Post],
        synchronize: false,
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CredentialsModule,
    PromptsModule,
    LimitsModule,
    LogsModule,
    MonitoringModule,
    DeepSeekModule,
    GeminiModule,
    WordPressModule,
    TelegramModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private appService: AppService) {}

  async onModuleInit(): Promise<void> {
    await this.appService.initializeCallbacks();
  }
}
