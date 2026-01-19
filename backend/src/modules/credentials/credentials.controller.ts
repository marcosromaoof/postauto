import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Credentials } from '../../database/entities';

class UpdateCredentialDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsBoolean()
  @IsOptional()
  encrypt?: boolean;
}

class UpdateMultipleCredentialsDto {
  credentials: UpdateCredentialDto[];
}

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private credentialsService: CredentialsService) {}

  @Get()
  async getAll() {
    return this.credentialsService.getAll();
  }

  @Put()
  async update(@Body() dto: UpdateCredentialDto) {
    return this.credentialsService.set(dto.key, dto.value, dto.encrypt !== false);
  }

  @Put('bulk')
  async updateMultiple(@Body() dto: UpdateMultipleCredentialsDto) {
    const results: Credentials[] = [];
    for (const cred of dto.credentials) {
      const result = await this.credentialsService.set(cred.key, cred.value, cred.encrypt !== false);
      results.push(result);
    }
    return results;
  }

  @Get('telegram/test')
  async testTelegram() {
    const config = await this.credentialsService.getTelegramConfig();
    return { configured: !!config };
  }

  @Get('deepseek/test')
  async testDeepSeek() {
    const config = await this.credentialsService.getDeepSeekConfig();
    return { configured: !!config };
  }

  @Get('gemini/test')
  async testGemini() {
    const config = await this.credentialsService.getGeminiConfig();
    return { configured: !!config };
  }

  @Get('wordpress/test')
  async testWordPress() {
    const config = await this.credentialsService.getWordPressConfig();
    return { configured: !!config };
  }
}
