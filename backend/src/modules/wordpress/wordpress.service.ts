import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { CredentialsService } from '../credentials';
import { LimitsService } from '../limits';
import { LogsService } from '../logs';
import { LogSource, UsageType } from '../../database/entities';
import { GeneratedImage } from '../gemini';

export interface PublishedPost {
  id: string;
  url: string;
  title: string;
}

export interface UploadedMedia {
  id: number;
  url: string;
  filename: string;
}

@Injectable()
export class WordPressService {
  constructor(
    private credentialsService: CredentialsService,
    private limitsService: LimitsService,
    private logsService: LogsService,
  ) {}

  private async getAuthHeader(): Promise<string> {
    const config = await this.credentialsService.getWordPressConfig();
    if (!config) {
      throw new BadRequestException('WordPress não configurado. Configure as credenciais no painel admin.');
    }
    const credentials = Buffer.from(`${config.user}:${config.appPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async getBaseUrl(): Promise<string> {
    const config = await this.credentialsService.getWordPressConfig();
    if (!config) {
      throw new BadRequestException('WordPress não configurado');
    }
    return config.url.replace(/\/$/, '');
  }

  async uploadMedia(imagePath: string, altText: string): Promise<UploadedMedia> {
    const authHeader = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();

    const filename = path.basename(imagePath);
    const fileBuffer = fs.readFileSync(imagePath);

    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename,
      contentType: 'image/png',
    });

    try {
      await this.logsService.info(LogSource.WORDPRESS, `Fazendo upload de mídia: ${filename}`);

      const response = await axios.post(`${baseUrl}/wp-json/wp/v2/media`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': authHeader,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        timeout: 60000,
      });

      if (altText) {
        await axios.post(
          `${baseUrl}/wp-json/wp/v2/media/${response.data.id}`,
          { alt_text: altText },
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
          },
        );
      }

      await this.logsService.info(LogSource.WORDPRESS, `Mídia enviada com sucesso: ${response.data.id}`);

      return {
        id: response.data.id,
        url: response.data.source_url,
        filename,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      await this.logsService.error(LogSource.WORDPRESS, `Erro ao fazer upload de mídia: ${errorMessage}`);
      throw new BadRequestException(`Erro ao fazer upload de mídia: ${errorMessage}`);
    }
  }

  async createPost(
    title: string,
    content: string,
    images: GeneratedImage[],
  ): Promise<PublishedPost> {
    await this.limitsService.checkPostLimit();

    const authHeader = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();

    const uploadedMedia: UploadedMedia[] = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const altText = `Imagem ${i + 1} - ${title}`;
      const media = await this.uploadMedia(image.localPath, altText);
      uploadedMedia.push(media);
    }

    let htmlContent = content;
    uploadedMedia.forEach((media, index) => {
      const imageHtml = `<figure class="wp-block-image"><img src="${media.url}" alt="Imagem ${index + 1} - ${title}" class="wp-image-${media.id}"/></figure>`;
      
      const paragraphs = htmlContent.split('</p>');
      const insertPosition = Math.min(Math.floor((index + 1) * paragraphs.length / (uploadedMedia.length + 1)), paragraphs.length - 1);
      
      if (insertPosition > 0 && insertPosition < paragraphs.length) {
        paragraphs[insertPosition] = paragraphs[insertPosition] + imageHtml;
        htmlContent = paragraphs.join('</p>');
      } else {
        htmlContent += imageHtml;
      }
    });

    try {
      await this.logsService.info(LogSource.WORDPRESS, `Criando post: ${title}`);

      const postData: any = {
        title,
        content: htmlContent,
        status: 'publish',
      };

      if (uploadedMedia.length > 0) {
        postData.featured_media = uploadedMedia[0].id;
      }

      const response = await axios.post(`${baseUrl}/wp-json/wp/v2/posts`, postData, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      await this.limitsService.recordUsage(UsageType.POST_CREATION, 1, {
        title,
        postId: response.data.id,
      });

      await this.logsService.info(LogSource.WORDPRESS, `Post publicado com sucesso: ${response.data.id}`, {
        postId: response.data.id,
        url: response.data.link,
      });

      return {
        id: response.data.id.toString(),
        url: response.data.link,
        title: response.data.title.rendered,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      await this.logsService.error(LogSource.WORDPRESS, `Erro ao criar post: ${errorMessage}`);
      throw new BadRequestException(`Erro ao criar post: ${errorMessage}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const authHeader = await this.getAuthHeader();
      const baseUrl = await this.getBaseUrl();

      const response = await axios.get(`${baseUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': authHeader,
        },
        timeout: 30000,
      });

      if (response.data.id) {
        return {
          success: true,
          message: `Conexão estabelecida. Usuário: ${response.data.name}`,
        };
      }
      return { success: false, message: 'Resposta inesperada do WordPress' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      return { success: false, message: `Erro: ${errorMessage}` };
    }
  }
}
