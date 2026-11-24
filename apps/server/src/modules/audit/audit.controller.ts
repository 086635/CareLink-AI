import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditLogEntity } from '../../infra/typeorm/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class AuditLogQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  objectType?: string;

  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'DELETE', 'POST', 'PUT', 'PATCH', 'DELETE'])
  action?: string;
}

@Controller('v1/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  @Get()
  @RequirePermissions('audit:read')
  async list(@Query() query: AuditLogQuery, @CurrentUser() user: AuthUser) {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .where('log.orgId = :orgId', { orgId: user.orgId })
      .orderBy('log.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.objectType) {
      qb.andWhere('log.objectType = :type', { type: query.objectType });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: query.page, pageSize: query.pageSize };
  }
}