import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareTaskEntity,
  HandoverEntity,
  HandoverItemEntity,
} from '../../infra/typeorm/entities';
import { HandoverService } from './handover.service';
import { HandoverController } from './handover.controller';
import { CaregiverModule } from '../caregiver/caregiver.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HandoverEntity, HandoverItemEntity, CareTaskEntity]),
    CaregiverModule,
    NotificationModule,
  ],
  controllers: [HandoverController],
  providers: [HandoverService],
  exports: [HandoverService],
})
export class HandoverModule {}