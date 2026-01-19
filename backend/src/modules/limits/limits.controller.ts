import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsNumber, IsOptional, Min } from 'class-validator';

class UpdateLimitsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  requestsPerHour?: number;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  tokensPerHour?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  imagesPerDay?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  postsPerHour?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cooldownSeconds?: number;
}

@Controller('limits')
@UseGuards(JwtAuthGuard)
export class LimitsController {
  constructor(private limitsService: LimitsService) {}

  @Get()
  async getLimits() {
    return this.limitsService.getLimits();
  }

  @Put()
  async updateLimits(@Body() dto: UpdateLimitsDto) {
    return this.limitsService.updateLimits(dto);
  }

  @Get('stats')
  async getStats() {
    return this.limitsService.getUsageStats();
  }
}
