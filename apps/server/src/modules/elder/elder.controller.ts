import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { ElderService } from './elder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class CreateElderBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsIn(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsString()
  @IsNotEmpty()
  bedLocationId: string;

  @IsInt()
  @Min(1)
  @Max(3)
  careLevel: number;

  @IsIn(['BEDRIDDEN', 'LIMITED', 'MOBILE'])
  mobility: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  careNotes?: string;
}

export class UpdateElderBody {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bedLocationId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  careLevel?: number;

  @IsOptional()
  @IsIn(['BEDRIDDEN', 'LIMITED', 'MOBILE'])
  mobility?: 'BEDRIDDEN' | 'LIMITED' | 'MOBILE';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  careNotes?: string | null;

  @IsOptional()
  @IsIn(['IN_CARE', 'ARCHIVED'])
  status?: 'IN_CARE' | 'ARCHIVED';
}

@Controller('v1/elders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ElderController {
  constructor(private readonly elderService: ElderService) {}

  @Post()
  @RequirePermissions('elder:manage')
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateElderBody) {
    return this.elderService.create(user.orgId, body);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('keyword') keyword?: string) {
    return this.elderService.list(user.orgId, keyword);
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.elderService.detail(id, user.orgId);
  }

  @Put(':id')
  @RequirePermissions('elder:manage')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateElderBody) {
    return this.elderService.update(id, user.orgId, body);
  }
}