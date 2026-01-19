import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CredentialsService } from '../credentials';
import { LimitsService } from '../limits';
import { LogsService } from '../logs/index';
import { LogSource, UsageType } from '../../database/entities';

export interface GeneratedImage {
  localPath: string;
  filename: string;
  prompt: string;
}

@Injectable()
export class GeminiService {
  private readonly uploadDir: string;

  constructor(
    private credentialsService: CredentialsService,
    private limitsService: LimitsService,
    private logsService: LogsService,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || '/var/www/postauto/uploads';
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generateImages(prompts: string[]): Promise<GeneratedImage[]> {
    const config = await this.credentialsService.getGeminiConfig();
    if (!config) {
      throw new BadRequestException('Gemini não configurado. Configure as credenciais no painel admin.');
    }

    await this.limitsService.checkImageLimit(prompts.length);

    const generatedImages: GeneratedImage[] = [];

    for (const prompt of prompts) {
      try {
        await this.logsService.info(LogSource.IMAGES, `Gerando imagem para prompt: ${prompt.substring(0, 50)}...`);

        const image = await this.generateSingleImage(config.apiKey, prompt);
        generatedImages.push(image);

        await this.limitsService.recordUsage(UsageType.IMAGE_GENERATION, 1, { prompt });

        await this.logsService.info(LogSource.IMAGES, `Imagem gerada com sucesso: ${image.filename}`);

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        await this.logsService.error(LogSource.IMAGES, `Erro ao gerar imagem: ${error.message}`, { prompt });
        throw error;
      }
    }

    return generatedImages;
  }

  private async generateSingleImage(apiKey: string, prompt: string): Promise<GeneratedImage> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(
        apiUrl,
        {
          contents: [
            {
              parts: [
                {
                  text: `Generate a high-quality, professional image based on this description: ${prompt}. The image should be suitable for a blog post, with good composition and lighting.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/png',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      const candidates = response.data.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('Nenhuma imagem gerada pelo Gemini');
      }

      const parts = candidates[0].content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (!imagePart || !imagePart.inlineData?.data) {
        throw new Error('Resposta do Gemini não contém imagem válida');
      }

      const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      const filename = `${uuidv4()}.png`;
      const localPath = path.join(this.uploadDir, filename);

      fs.writeFileSync(localPath, imageBuffer);

      return {
        localPath,
        filename,
        prompt,
      };
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new BadRequestException('Limite de requisições do Gemini atingido. Tente novamente mais tarde.');
      }
      throw new BadRequestException(`Erro ao gerar imagem: ${error.message}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.credentialsService.getGeminiConfig();
    if (!config) {
      return { success: false, message: 'Gemini não configurado' };
    }

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });

      if (response.data.models) {
        return { success: true, message: 'Conexão com Gemini estabelecida com sucesso' };
      }
      return { success: false, message: 'Resposta inesperada do Gemini' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      return { success: false, message: `Erro: ${errorMessage}` };
    }
  }
}
