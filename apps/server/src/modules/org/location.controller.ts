import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class CreateLocationBody {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsIn(['BUILDING', 'FLOOR', 'ROOM', 'BED'])
  level: 'BUILDING' | 'FLOOR' | 'ROOM' | 'BED';

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;
}

export class UpdateLocationBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;
}

@Controller('v1/locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('tree')
  async tree(@CurrentUser() user: AuthUser) {
    return this.locationService.tree(user.orgId);
  }

  @Post()
  @RequirePermissions('location:manage')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateLocationBody) {
    if (body.level === 'BUILDING') {
      return this.locationService.createBuilding(user.orgId, body.name);
    }
    if (!body.parentId) {
      throw new Error('parentId 必填');
    }
    return this.locationService.create(user.orgId, body.parentId, body.level, body.name);
  }

  @Put(':id')
  @RequirePermissions('location:manage')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateLocationBody) {
    return this.locationService.updateName(id, user.orgId, body.name);
  }

  @Get('beds')
  async beds(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: 'FREE' | 'OCCUPIED',
  ) {
    return this.locationService.beds(user.orgId, status);
  }
}