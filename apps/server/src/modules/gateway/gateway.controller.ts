import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { GatewayService, ReadingBody, HeartbeatBody } from './gateway.service';
import { DeviceKeyGuard } from './device-key.guard';
import type { DeviceEntity } from '../../infra/typeorm/entities';

class ReadingDto implements ReadingBody {
  @IsString()
  deviceNo: string;

  @IsString()
  collectedAt: string;

  @IsIn(['MOISTURE', 'BATTERY', 'HEARTBEAT'])
  metricType: 'MOISTURE' | 'BATTERY' | 'HEARTBEAT';

  @IsNumber()
  metricValue: number;
}

class HeartbeatDto implements HeartbeatBody {
  @IsString()
  deviceNo: string;

  @IsOptional()
  @IsNumber()
  battery?: number;
}

@Controller('v1/device')
@UseGuards(DeviceKeyGuard)
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post('readings')
  async readings(@Req() req: { device: DeviceEntity }, @Body() body: ReadingDto) {
    return this.gatewayService.ingestReading(req.device, body);
  }

  @Post('heartbeat')
  async heartbeat(@Req() req: { device: DeviceEntity }, @Body() body: HeartbeatDto) {
    return this.gatewayService.ingestHeartbeat(req.device, body);
  }
}