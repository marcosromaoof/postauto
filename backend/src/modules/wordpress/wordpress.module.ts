import { Module } from '@nestjs/common';
import { WordPressService } from './wordpress.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';
import { LogsModule } from '../logs';

@Module({
  imports: [CredentialsModule, LimitsModule, LogsModule],
  providers: [WordPressService],
  exports: [WordPressService],
})
export class WordPressModule {}
