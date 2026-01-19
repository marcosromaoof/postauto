import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { Post } from '../../database/entities';
import { CredentialsModule } from '../credentials';
import { LogsModule } from '../logs';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    CredentialsModule,
    LogsModule,
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
