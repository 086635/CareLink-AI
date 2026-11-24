import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareEventEntity,
  CareTaskEntity,
  ElderEntity,
  StatusTransitionLogEntity,
} from '../../infra/typeorm/entities';
import { IdentifyService } from './identify.service';
import { EventStateMachineService } from './state-machine.service';
import { FalseAlarmService } from './false-alarm.service';
import { EventController } from './event.controller';
import { RuleModule } from '../rule/rule.module';
import { NotificationModule } from '../notification/notification.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CareEventEntity, CareTaskEntity, ElderEntity, StatusTransitionLogEntity]),
    RuleModule,
    NotificationModule,
    TaskModule,
  ],
  controllers: [EventController],
  providers: [IdentifyService, EventStateMachineService, FalseAlarmService],
  exports: [IdentifyService, EventStateMachineService, FalseAlarmService],
})
export class EventModule {}