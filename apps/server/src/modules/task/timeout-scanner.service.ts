import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { CareTaskEntity } from '../../infra/typeorm/entities';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TimeoutScannerService {
  private readonly logger = new Logger(TimeoutScannerService.name);

  constructor(
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * R016：超时是附加标记，只置 timeout_flag，不改 status、不调用状态机、不自动完成。
   * 扫描条件化全量执行，重启后自然续跑（NFR-004）。
   */
  @Cron('0 * * * * *')
  async scanTimeouts(): Promise<void> {
    try {
      const expired = await this.taskRepo.find({
        where: {
          status: In(['UNASSIGNED', 'UNCLAIMED', 'PROCESSING']),
          timeoutFlag: false,
          deadline: LessThan(new Date()),
        },
      });
      if (expired.length === 0) return;

      await this.taskRepo.update(
        { id: In(expired.map((t) => t.id)) },
        { timeoutFlag: true, timeoutAt: new Date() },
      );

      for (const task of expired) {
        const receiverIds = task.ownerId ? [task.ownerId] : [];
        await this.notificationService.notifyTaskTimeout(
          {
            taskId: task.id,
            orgId: task.orgId,
            ownerId: task.ownerId,
            deadline: task.deadline.toISOString(),
          },
          receiverIds,
        );
      }
      this.logger.warn(`超时扫描：${expired.length} 个任务被标记超时（状态不变，R016）`);
    } catch (err) {
      this.logger.error(`超时扫描失败: ${(err as Error).message}`);
    }
  }
}