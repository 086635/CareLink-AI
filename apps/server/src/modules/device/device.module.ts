import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CareCycleEntity,
  DeviceBindingEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { DeviceService } from './device.service';
import { BindingService } from './binding.service';
import { DeviceController } from './device.controller';
import { CareCycleService } from './care-cycle.service';
import { OnlineScannerService } from './online-scanner.service';
import { RuleModule } from '../rule/rule.module';
import { EventModule } from '../event/event.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity, DeviceBindingEntity, ElderEntity, CareCycleEntity]),
    RuleModule,
    EventModule,
    NotificationModule,
  ],
  controllers: [DeviceController],
  providers: [DeviceService, BindingService, CareCycleService, OnlineScannerService],
  exports: [DeviceService, BindingService, CareCycleService],
})
export class DeviceModule {}