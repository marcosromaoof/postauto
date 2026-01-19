import { Module } from '@nestjs/common';
import { DeepSeekService } from './deepseek.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';
import { PromptsModule } from '../prompts';
import { LogsModule } from '../logs';

@Module({
  imports: [CredentialsModule, LimitsModule, PromptsModule, LogsModule],
  providers: [DeepSeekService],
  exports: [DeepSeekService],
})
export class DeepSeekModule {}
