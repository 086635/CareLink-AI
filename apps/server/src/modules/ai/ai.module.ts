import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AiReportEntity,
  CareRecordEntity,
  CareTaskEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { StatsEngineService } from './stats-engine.service';
import { HandoverSummaryService } from './handover-summary.service';
import { CareReportService } from './care-report.service';
import { AiController } from './ai.controller';
import { LlmProvider } from '../../infra/llm/llm-provider';
import { RuleModule } from '../rule/rule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiReportEntity, CareRecordEntity, CareTaskEntity, DeviceEntity, ElderEntity]),
    RuleModule,
  ],
  controllers: [AiController],
  providers: [StatsEngineService, HandoverSummaryService, CareReportService, LlmProvider],
  exports: [StatsEngineService, HandoverSummaryService, CareReportService],
})
export class AiModule {}