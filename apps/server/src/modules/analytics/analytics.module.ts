import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareEventEntity,
  CareLocationEntity,
  CareTaskEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { AnalyticsService } from './analytics.service';
import { StatsService } from './stats.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ElderEntity, DeviceEntity, CareTaskEntity, CareLocationEntity, CareEventEntity]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, StatsService],
  exports: [AnalyticsService, StatsService],
})
export class AnalyticsModule {}