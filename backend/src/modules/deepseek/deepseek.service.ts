import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { CredentialsService } from '../credentials';
import { LimitsService } from '../limits';
import { PromptsService } from '../prompts';
import { LogsService } from '../logs/index';
import { LogSource, UsageType } from '../../database/entities';

export interface GeneratedContent {
  title: string;
  content: string;
  imagePrompts: string[];
  tokensUsed: number;
}

@Injectable()
export class DeepSeekService {
  private readonly apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(
    private credentialsService: CredentialsService,
    private limitsService: LimitsService,
    private promptsService: PromptsService,
    private logsService: LogsService,
  ) {}

  async generateContent(subject: string): Promise<GeneratedContent> {
    const config = await this.credentialsService.getDeepSeekConfig();
    if (!config) {
      throw new BadRequestException('DeepSeek não configurado. Configure as credenciais no painel admin.');
    }

    await this.limitsService.checkRequestLimit();

    const fullPrompt = await this.promptsService.buildPrompt(subject);

    await this.logsService.info(LogSource.IA, `Iniciando geração de conteúdo para: ${subject}`);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: config.model || 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'Você é um redator profissional especializado em criar artigos informativos e envolventes em português do Brasil.',
            },
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;

      await this.limitsService.checkTokenLimit(tokensUsed);
      await this.limitsService.recordUsage(UsageType.IA_REQUEST, 1, { subject });
      await this.limitsService.recordUsage(UsageType.IA_TOKENS, tokensUsed, { subject });

      const parsed = this.parseContent(content);

      await this.logsService.info(LogSource.IA, `Conteúdo gerado com sucesso`, {
        subject,
        tokensUsed,
        titleLength: parsed.title.length,
        contentLength: parsed.content.length,
        imagePromptsCount: parsed.imagePrompts.length,
      });

      return {
        ...parsed,
        tokensUsed,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      await this.logsService.error(LogSource.IA, `Erro ao gerar conteúdo: ${errorMessage}`, {
        subject,
        error: errorMessage,
      });
      throw new BadRequestException(`Erro ao gerar conteúdo: ${errorMessage}`);
    }
  }

  private parseContent(content: string): { title: string; content: string; imagePrompts: string[] } {
    let title = '';
    let articleContent = '';
    let imagePrompts: string[] = [];

    const titleMatch = content.match(/---TITULO---\s*([\s\S]*?)(?=---CONTEUDO---|$)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    const contentMatch = content.match(/---CONTEUDO---\s*([\s\S]*?)(?=---PROMPTS_IMAGEM---|$)/i);
    if (contentMatch) {
      articleContent = contentMatch[1].trim();
    }

    const promptsMatch = content.match(/---PROMPTS_IMAGEM---\s*([\s\S]*?)$/i);
    if (promptsMatch) {
      imagePrompts = promptsMatch[1]
        .trim()
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !p.startsWith('---'));
    }

    if (!title && !articleContent) {
      const lines = content.split('\n');
      title = lines[0]?.replace(/^#\s*/, '').trim() || 'Artigo';
      articleContent = lines.slice(1).join('\n').trim();
    }

    if (imagePrompts.length === 0) {
      imagePrompts = [
        `Professional photo illustration for article about: ${title}`,
        `Infographic style image representing: ${title}`,
        `Modern digital art concept for: ${title}`,
      ];
    }

    return { title, content: articleContent, imagePrompts };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.credentialsService.getDeepSeekConfig();
    if (!config) {
      return { success: false, message: 'DeepSeek não configurado' };
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: config.model || 'deepseek-chat',
          messages: [{ role: 'user', content: 'Olá, teste de conexão.' }],
          max_tokens: 10,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (response.data.choices) {
        return { success: true, message: 'Conexão com DeepSeek estabelecida com sucesso' };
      }
      return { success: false, message: 'Resposta inesperada do DeepSeek' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      return { success: false, message: `Erro: ${errorMessage}` };
    }
  }
}
