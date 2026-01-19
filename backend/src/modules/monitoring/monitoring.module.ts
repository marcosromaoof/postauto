import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { Usage, Post, Log } from '../../database/entities';
import { LimitsModule } from '../limits';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usage, Post, Log]),
    LimitsModule,
  ],
  providers: [MonitoringService],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}
