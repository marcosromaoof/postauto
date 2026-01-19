import { Module } from '@nestjs/common';
import { WordPressService } from './wordpress.service';
import { CredentialsModule } from '../credentials';
import { LimitsModule } from '../limits';

@Module({
  imports: [CredentialsModule, LimitsModule],
  providers: [WordPressService],
  exports: [WordPressService],
})
export class WordPressModule {}
