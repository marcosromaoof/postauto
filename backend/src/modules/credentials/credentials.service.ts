import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Credentials } from '../../database/entities';

@Injectable()
export class CredentialsService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(
    @InjectRepository(Credentials)
    private credentialsRepository: Repository<Credentials>,
    private configService: ConfigService,
  ) {
    const secret = this.configService.get('JWT_SECRET') || 'default_encryption_key';
    this.key = scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const [ivHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedText;
    }
  }

  async getAll(): Promise<Credentials[]> {
    const credentials = await this.credentialsRepository.find();
    return credentials.map(cred => ({
      ...cred,
      value: cred.isEncrypted && cred.value ? '********' : cred.value,
    }));
  }

  async get(key: string): Promise<string | null> {
    const credential = await this.credentialsRepository.findOne({ where: { key } });
    if (!credential || !credential.value) {
      return null;
    }
    return credential.isEncrypted ? this.decrypt(credential.value) : credential.value;
  }

  async set(key: string, value: string, encrypt: boolean = true): Promise<Credentials> {
    let credential = await this.credentialsRepository.findOne({ where: { key } });
    
    const encryptedValue = encrypt && value ? this.encrypt(value) : value;
    
    if (credential) {
      credential.value = encryptedValue;
      credential.isEncrypted = encrypt && !!value;
      return this.credentialsRepository.save(credential);
    }
    
    credential = this.credentialsRepository.create({
      key,
      value: encryptedValue,
      isEncrypted: encrypt && !!value,
    });
    
    return this.credentialsRepository.save(credential);
  }

  async getTelegramConfig(): Promise<{ botToken: string; chatId: string } | null> {
    const botToken = await this.get('telegram_bot_token');
    const chatId = await this.get('telegram_chat_id');
    
    if (!botToken || !chatId) {
      return null;
    }
    
    return { botToken, chatId };
  }

  async getDeepSeekConfig(): Promise<{ apiKey: string; model: string } | null> {
    const apiKey = await this.get('deepseek_api_key');
    const model = await this.get('deepseek_model') || 'deepseek-chat';
    
    if (!apiKey) {
      return null;
    }
    
    return { apiKey, model };
  }

  async getGeminiConfig(): Promise<{ apiKey: string } | null> {
    const apiKey = await this.get('gemini_api_key');
    
    if (!apiKey) {
      return null;
    }
    
    return { apiKey };
  }

  async getWordPressConfig(): Promise<{ url: string; user: string; appPassword: string } | null> {
    const url = await this.get('wordpress_url');
    const user = await this.get('wordpress_user');
    const appPassword = await this.get('wordpress_app_password');
    
    if (!url || !user || !appPassword) {
      return null;
    }
    
    return { url, user, appPassword };
  }
}
