import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity, SensorReadingEntity } from '../../infra/typeorm/entities';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { DeviceKeyGuard } from './device-key.guard';
import { DeviceModule } from '../device/device.module';
import { EventModule } from '../event/event.module';
import { SimulatorService } from './simulator/simulator.service';
import { SimulatorController } from './simulator/simulator.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorReadingEntity, DeviceEntity]),
    DeviceModule,
    EventModule,
  ],
  controllers: [GatewayController, SimulatorController],
  providers: [GatewayService, DeviceKeyGuard, SimulatorService],
  exports: [GatewayService],
})
export class GatewayModule {}