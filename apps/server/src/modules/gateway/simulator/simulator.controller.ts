import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SimulatorService, ScriptName } from './simulator.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user';

export class CreateSimulatedDeviceBody {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceNo?: string;
}

export class ScriptBody {
  @IsIn(['NORMAL', 'MOISTURE', 'REPEAT', 'OFFLINE', 'LOW_BATTERY'])
  script: ScriptName;
}

@Controller('v1/simulator/devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateSimulatedDeviceBody) {
    return this.simulatorService.createSimulatedDevice(user.orgId, body.deviceNo);
  }

  @Get('running')
  async running() {
    return this.simulatorService.listRunning();
  }

  @Post(':id/scripts')
  async start(@Param('id') id: string, @Body() body: ScriptBody) {
    return this.simulatorService.startScript(id, body.script);
  }

  @Post(':id/scripts/stop')
  async stop(@Param('id') id: string) {
    return this.simulatorService.stopScript(id);
  }
}