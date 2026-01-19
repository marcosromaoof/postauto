import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LimitsService } from './limits.service';
import { LimitsController } from './limits.controller';
import { Limits, Usage } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Limits, Usage])],
  providers: [LimitsService],
  controllers: [LimitsController],
  exports: [LimitsService],
})
export class LimitsModule {}
