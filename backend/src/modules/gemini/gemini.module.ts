import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';
import { LogsModule } from '../logs';

@Module({
  imports: [CredentialsModule, LimitsModule, LogsModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
