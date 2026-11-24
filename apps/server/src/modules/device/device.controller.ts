import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeviceService } from './device.service';
import { BindingService } from './binding.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class CreateDeviceBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  deviceNo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  deviceType: string;

  @IsIn(['REAL', 'SIMULATED'])
  source: 'REAL' | 'SIMULATED';
}

export class UpdateDeviceBody {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  deviceType?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'RETIRED'])
  status?: 'ACTIVE' | 'RETIRED';
}

export class CreateBindingBody {
  @IsString()
  @IsNotEmpty()
  elderId: string;
}

@Controller('v1/devices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeviceController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly bindingService: BindingService,
  ) {}

  @Post()
  @RequirePermissions('device:manage')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateDeviceBody) {
    return this.deviceService.create(user.orgId, body);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.deviceService.list(user.orgId);
  }

  @Put(':id')
  @RequirePermissions('device:manage')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateDeviceBody) {
    return this.deviceService.update(id, user.orgId, body);
  }

  @Post(':id/bindings')
  @RequirePermissions('device:manage')
  async bind(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateBindingBody,
  ) {
    return this.bindingService.bind(id, user.orgId, body.elderId, user.userId);
  }

  @Get(':id/bindings')
  async bindingHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bindingService.bindingHistory(id, user.orgId);
  }

  @Put(':id/bindings/:bindingId')
  @RequirePermissions('device:manage')
  async unbind(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('bindingId') bindingId: string,
  ) {
    return this.bindingService.unbind(id, user.orgId, bindingId);
  }
}