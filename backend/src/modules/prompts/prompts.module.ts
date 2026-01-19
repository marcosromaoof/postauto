import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { Prompt } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Prompt])],
  providers: [PromptsService],
  controllers: [PromptsController],
  exports: [PromptsService],
})
export class PromptsModule {}
