import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareCycleEntity,
  CareEventEntity,
  CareRecordEntity,
  CareTaskEntity,
  ElderEntity,
  StatusTransitionLogEntity,
} from '../../infra/typeorm/entities';
import { QuickChangeService } from './quick-change.service';
import { RecordService } from './record.service';
import { RecordController } from './record.controller';
import { EventModule } from '../event/event.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CareRecordEntity,
      CareTaskEntity,
      CareEventEntity,
      CareCycleEntity,
      ElderEntity,
      StatusTransitionLogEntity,
    ]),
    EventModule,
    TaskModule,
  ],
  controllers: [RecordController],
  providers: [QuickChangeService, RecordService],
  exports: [RecordService],
})
export class RecordModule {}