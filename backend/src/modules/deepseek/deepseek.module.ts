import { Module } from '@nestjs/common';
import { DeepSeekService } from './deepseek.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';
import { PromptsModule } from '../prompts';

@Module({
  imports: [CredentialsModule, LimitsModule, PromptsModule],
  providers: [DeepSeekService],
  exports: [DeepSeekService],
})
export class DeepSeekModule {}
