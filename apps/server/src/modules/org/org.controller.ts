import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class UpdateOrgBody {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  contact?: string;
}

export class UpdateOrgStatusBody {
  @IsIn(['ENABLED', 'DISABLED'])
  status: 'ENABLED' | 'DISABLED';
}

@Controller('v1/orgs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('me')
  async myOrg(@CurrentUser() user: AuthUser) {
    return this.orgService.findById(user.orgId);
  }

  @Put(':id')
  @RequirePermissions('org:manage')
  async update(@Param('id') id: string, @Body() body: UpdateOrgBody) {
    return this.orgService.update(id, body);
  }

  @Put(':id/status')
  @RequirePermissions('org:manage')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateOrgStatusBody) {
    return this.orgService.updateStatus(id, body.status);
  }
}