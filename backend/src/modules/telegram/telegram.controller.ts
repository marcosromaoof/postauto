import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('telegram')
@UseGuards(JwtAuthGuard)
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Get('test')
  async testConnection() {
    return this.telegramService.testConnection();
  }

  @Post('reinit')
  async reinitBot() {
    await this.telegramService.reinitBot();
    return { message: 'Bot reiniciado' };
  }
}
