import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('monitoring')
@UseGuards(JwtAuthGuard)
export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.monitoringService.getDashboardData();
  }

  @Get('ia')
  async getIaUsage(@Query('hours') hours?: string) {
    return this.monitoringService.getIaUsage(hours ? parseInt(hours, 10) : 24);
  }

  @Get('images')
  async getImageUsage(@Query('days') days?: string) {
    return this.monitoringService.getImageUsage(days ? parseInt(days, 10) : 7);
  }

  @Get('queue')
  async getQueueStatus() {
    return this.monitoringService.getQueueStatus();
  }

  @Get('errors')
  async getErrors(@Query('hours') hours?: string) {
    return this.monitoringService.getErrorsSummary(hours ? parseInt(hours, 10) : 24);
  }
}
