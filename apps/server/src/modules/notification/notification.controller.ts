import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

export class NotificationQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

@Controller('v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: NotificationQuery) {
    return this.notificationService.listForReceiver(user.userId, query.page, query.pageSize);
  }

  @Put(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notificationService.markRead(id, user.userId);
    return null;
  }
}