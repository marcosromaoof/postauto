import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';

@Module({
  imports: [CredentialsModule, LimitsModule],
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
