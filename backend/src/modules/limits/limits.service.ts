import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Limits, Usage, UsageType } from '../../database/entities';

@Injectable()
export class LimitsService {
  constructor(
    @InjectRepository(Limits)
    private limitsRepository: Repository<Limits>,
    @InjectRepository(Usage)
    private usageRepository: Repository<Usage>,
  ) {}

  async getLimits(): Promise<Limits> {
    let limits = await this.limitsRepository.findOne({});
    if (!limits) {
      limits = this.limitsRepository.create({
        requestsPerHour: 10,
        tokensPerHour: 50000,
        imagesPerDay: 50,
        postsPerHour: 5,
        cooldownSeconds: 60,
      });
      await this.limitsRepository.save(limits);
    }
    return limits;
  }

  async updateLimits(data: Partial<Limits>): Promise<Limits> {
    const limits = await this.getLimits();
    Object.assign(limits, data);
    return this.limitsRepository.save(limits);
  }

  async recordUsage(type: UsageType, count: number = 1, metadata?: Record<string, any>): Promise<Usage> {
    const usage = this.usageRepository.create({
      type,
      count,
      metadata,
    });
    return this.usageRepository.save(usage);
  }

  async getUsageInPeriod(type: UsageType, periodMinutes: number): Promise<number> {
    const since = new Date(Date.now() - periodMinutes * 60 * 1000);
    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.type = :type', { type })
      .andWhere('usage.createdAt > :since', { since })
      .getRawOne();
    
    return parseInt(result?.total || '0', 10);
  }

  async checkRequestLimit(): Promise<boolean> {
    const limits = await this.getLimits();
    const usageLastHour = await this.getUsageInPeriod(UsageType.IA_REQUEST, 60);
    
    if (usageLastHour >= limits.requestsPerHour) {
      throw new BadRequestException(`Limite de ${limits.requestsPerHour} requisições por hora atingido`);
    }
    
    return true;
  }

  async checkTokenLimit(tokensToUse: number): Promise<boolean> {
    const limits = await this.getLimits();
    const tokensLastHour = await this.getUsageInPeriod(UsageType.IA_TOKENS, 60);
    
    if (tokensLastHour + tokensToUse > limits.tokensPerHour) {
      throw new BadRequestException(`Limite de ${limits.tokensPerHour} tokens por hora seria excedido`);
    }
    
    return true;
  }

  async checkImageLimit(imagesToGenerate: number = 1): Promise<boolean> {
    const limits = await this.getLimits();
    const imagesLastDay = await this.getUsageInPeriod(UsageType.IMAGE_GENERATION, 24 * 60);
    
    if (imagesLastDay + imagesToGenerate > limits.imagesPerDay) {
      throw new BadRequestException(`Limite de ${limits.imagesPerDay} imagens por dia seria excedido`);
    }
    
    return true;
  }

  async checkPostLimit(): Promise<boolean> {
    const limits = await this.getLimits();
    const postsLastHour = await this.getUsageInPeriod(UsageType.POST_CREATION, 60);
    
    if (postsLastHour >= limits.postsPerHour) {
      throw new BadRequestException(`Limite de ${limits.postsPerHour} posts por hora atingido`);
    }
    
    return true;
  }

  async getUsageStats(): Promise<{
    requestsLastHour: number;
    tokensLastHour: number;
    imagesLastDay: number;
    postsLastHour: number;
    limits: Limits;
  }> {
    const limits = await this.getLimits();
    
    return {
      requestsLastHour: await this.getUsageInPeriod(UsageType.IA_REQUEST, 60),
      tokensLastHour: await this.getUsageInPeriod(UsageType.IA_TOKENS, 60),
      imagesLastDay: await this.getUsageInPeriod(UsageType.IMAGE_GENERATION, 24 * 60),
      postsLastHour: await this.getUsageInPeriod(UsageType.POST_CREATION, 60),
      limits,
    };
  }
}
