import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareTaskEntity, ElderEntity, StatusTransitionLogEntity } from '../../infra/typeorm/entities';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskStateMachineService } from './state-machine.service';
import { TimeoutScannerService } from './timeout-scanner.service';
import { RuleModule } from '../rule/rule.module';
import { CaregiverModule } from '../caregiver/caregiver.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CareTaskEntity, ElderEntity, StatusTransitionLogEntity]),
    RuleModule,
    CaregiverModule,
    NotificationModule,
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskStateMachineService, TimeoutScannerService],
  exports: [TaskService, TaskStateMachineService],
})
export class TaskModule {}