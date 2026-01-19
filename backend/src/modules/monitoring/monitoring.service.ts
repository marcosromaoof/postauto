import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Usage, Post, Log, UsageType, PostStatus, LogLevel } from '../../database/entities';
import { LimitsService } from '../limits';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(Usage)
    private usageRepository: Repository<Usage>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    private limitsService: LimitsService,
  ) {}

  async getIaUsage(hours: number = 24): Promise<{
    requests: number;
    tokens: number;
    hourlyBreakdown: { hour: string; requests: number; tokens: number }[];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const requestsResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.type = :type', { type: UsageType.IA_REQUEST })
      .andWhere('usage.createdAt > :since', { since })
      .getRawOne();

    const tokensResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.type = :type', { type: UsageType.IA_TOKENS })
      .andWhere('usage.createdAt > :since', { since })
      .getRawOne();

    const hourlyData = await this.usageRepository
      .createQueryBuilder('usage')
      .select("DATE_TRUNC('hour', usage.createdAt)", 'hour')
      .addSelect('usage.type', 'type')
      .addSelect('SUM(usage.count)', 'total')
      .where('usage.type IN (:...types)', { types: [UsageType.IA_REQUEST, UsageType.IA_TOKENS] })
      .andWhere('usage.createdAt > :since', { since })
      .groupBy("DATE_TRUNC('hour', usage.createdAt)")
      .addGroupBy('usage.type')
      .orderBy('hour', 'ASC')
      .getRawMany();

    const hourlyMap = new Map<string, { requests: number; tokens: number }>();
    hourlyData.forEach((row) => {
      const hourKey = new Date(row.hour).toISOString();
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, { requests: 0, tokens: 0 });
      }
      const entry = hourlyMap.get(hourKey)!;
      if (row.type === UsageType.IA_REQUEST) {
        entry.requests = parseInt(row.total, 10);
      } else {
        entry.tokens = parseInt(row.total, 10);
      }
    });

    const hourlyBreakdown = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      ...data,
    }));

    return {
      requests: parseInt(requestsResult?.total || '0', 10),
      tokens: parseInt(tokensResult?.total || '0', 10),
      hourlyBreakdown,
    };
  }

  async getImageUsage(days: number = 7): Promise<{
    total: number;
    dailyBreakdown: { date: string; count: number }[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalResult = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.count)', 'total')
      .where('usage.type = :type', { type: UsageType.IMAGE_GENERATION })
      .andWhere('usage.createdAt > :since', { since })
      .getRawOne();

    const dailyData = await this.usageRepository
      .createQueryBuilder('usage')
      .select("DATE_TRUNC('day', usage.createdAt)", 'date')
      .addSelect('SUM(usage.count)', 'total')
      .where('usage.type = :type', { type: UsageType.IMAGE_GENERATION })
      .andWhere('usage.createdAt > :since', { since })
      .groupBy("DATE_TRUNC('day', usage.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyBreakdown = dailyData.map((row) => ({
      date: new Date(row.date).toISOString().split('T')[0],
      count: parseInt(row.total, 10),
    }));

    return {
      total: parseInt(totalResult?.total || '0', 10),
      dailyBreakdown,
    };
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const statusCounts = await this.postRepository
      .createQueryBuilder('post')
      .select('post.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('post.status')
      .getRawMany();

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    statusCounts.forEach((row) => {
      const count = parseInt(row.count, 10);
      switch (row.status) {
        case PostStatus.PENDING_TEXT:
        case PostStatus.PENDING_APPROVAL:
          result.pending += count;
          break;
        case PostStatus.APPROVED:
        case PostStatus.GENERATING_IMAGES:
        case PostStatus.READY:
          result.processing += count;
          break;
        case PostStatus.PUBLISHED:
          result.completed += count;
          break;
        case PostStatus.CANCELLED:
        case PostStatus.ERROR:
          result.failed += count;
          break;
      }
    });

    return result;
  }

  async getErrorsSummary(hours: number = 24): Promise<{
    total: number;
    bySource: { source: string; count: number }[];
    recent: Log[];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const total = await this.logRepository.count({
      where: {
        level: LogLevel.ERROR,
        createdAt: Between(since, new Date()),
      },
    });

    const bySourceData = await this.logRepository
      .createQueryBuilder('log')
      .select('log.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('log.level = :level', { level: LogLevel.ERROR })
      .andWhere('log.createdAt > :since', { since })
      .groupBy('log.source')
      .getRawMany();

    const bySource = bySourceData.map((row) => ({
      source: row.source,
      count: parseInt(row.count, 10),
    }));

    const recent = await this.logRepository.find({
      where: {
        level: LogLevel.ERROR,
        createdAt: Between(since, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return { total, bySource, recent };
  }

  async getDashboardData(): Promise<{
    usageStats: Awaited<ReturnType<LimitsService['getUsageStats']>>;
    iaUsage: Awaited<ReturnType<MonitoringService['getIaUsage']>>;
    imageUsage: Awaited<ReturnType<MonitoringService['getImageUsage']>>;
    queueStatus: Awaited<ReturnType<MonitoringService['getQueueStatus']>>;
    errors: Awaited<ReturnType<MonitoringService['getErrorsSummary']>>;
  }> {
    const [usageStats, iaUsage, imageUsage, queueStatus, errors] = await Promise.all([
      this.limitsService.getUsageStats(),
      this.getIaUsage(24),
      this.getImageUsage(7),
      this.getQueueStatus(),
      this.getErrorsSummary(24),
    ]);

    return { usageStats, iaUsage, imageUsage, queueStatus, errors };
  }
}
