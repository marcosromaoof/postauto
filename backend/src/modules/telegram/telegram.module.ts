import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { Post } from '../../database/entities';
import { CredentialsModule } from '../credentials';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    CredentialsModule,
  ],
  providers: [TelegramService],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
