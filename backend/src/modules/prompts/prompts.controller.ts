import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';

class CreatePromptDto {
  @IsString()
  basePrompt: string;

  @IsString()
  @IsOptional()
  editorialRules?: string;
}

class UpdatePromptDto {
  @IsString()
  @IsOptional()
  basePrompt?: string;

  @IsString()
  @IsOptional()
  editorialRules?: string;
}

class TestPromptDto {
  @IsString()
  subject: string;
}

@Controller('prompts')
@UseGuards(JwtAuthGuard)
export class PromptsController {
  constructor(private promptsService: PromptsService) {}

  @Get()
  async getAll() {
    return this.promptsService.getAll();
  }

  @Get('active')
  async getActive() {
    return this.promptsService.getActive();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.promptsService.getById(id);
  }

  @Post()
  async create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromptDto) {
    return this.promptsService.update(id, dto);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.promptsService.activate(id);
  }

  @Post('test')
  async testPrompt(@Body() dto: TestPromptDto) {
    const fullPrompt = await this.promptsService.buildPrompt(dto.subject);
    return { prompt: fullPrompt };
  }
}
