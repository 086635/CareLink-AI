import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { CaregiverService } from './caregiver.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class CreateCaregiverBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  account: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsIn(['ADM', 'SUP', 'CG'])
  role: 'ADM' | 'SUP' | 'CG';

  @IsOptional()
  @IsString()
  areaLocationId?: string;
}

export class UpdateCaregiverBody {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsIn(['ADM', 'SUP', 'CG'])
  role?: 'ADM' | 'SUP' | 'CG';

  @IsOptional()
  @ValidateIf((o: UpdateCaregiverBody) => o.areaLocationId !== null)
  @IsString()
  areaLocationId?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';
}

export class ToggleDutyBody {
  @IsIn([true, false])
  onDuty: boolean;
}

@Controller('v1/caregivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CaregiverController {
  constructor(private readonly caregiverService: CaregiverService) {}

  @Post()
  @RequirePermissions('caregiver:manage')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateCaregiverBody) {
    return this.caregiverService.create(user.orgId, body);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    return this.caregiverService.list(user.orgId);
  }

  @Put(':id')
  @RequirePermissions('caregiver:manage')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateCaregiverBody) {
    return this.caregiverService.update(id, user.orgId, body);
  }

  @Put(':id/duty')
  @RequirePermissions('caregiver:manage')
  async toggleDuty(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: ToggleDutyBody) {
    return this.caregiverService.toggleDuty(id, user.orgId, body.onDuty);
  }
}