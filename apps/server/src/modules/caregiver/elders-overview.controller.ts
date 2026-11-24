import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import {
  CareEventEntity,
  CareLocationEntity,
  DeviceBindingEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/auth/auth-user';

interface ElderOverviewItem {
  elderId: string;
  elderName: string;
  bedLabel: string | null;
  careLevel: number;
  monitorStatus: 'NORMAL' | 'PENDING_CHECK' | 'OFFLINE_UNKNOWN';
  deviceId: string | null;
  deviceNo: string | null;
  deviceOnlineStatus: string | null;
  pendingEventCount: number;
}

/**
 * T1 唯一新增后端接口（只读聚合，不触碰任何状态机与业务规则，FR-H5-007）。
 * R005：设备离线时监测状态显示"离线/未知"，不得显示正常或干燥。
 */
@Controller('v1/caregivers/me')
@UseGuards(JwtAuthGuard)
export class EldersOverviewController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
  ) {}

  @Get('elders-overview')
  async overview(@CurrentUser() user: AuthUser): Promise<{ list: ElderOverviewItem[] }> {
    const em = this.dataSource;
    const elders = await this.elderRepo.find({
      where: { orgId: user.orgId, status: 'IN_CARE' },
      order: { id: 'ASC' },
    });
    if (elders.length === 0) {
      return { list: [] };
    }

    const locationRepo = em.getRepository(CareLocationEntity);
    const bindingRepo = em.getRepository(DeviceBindingEntity);
    const deviceRepo = em.getRepository(DeviceEntity);
    const eventRepo = em.getRepository(CareEventEntity);

    const bindings = await bindingRepo.find({ where: { endedAt: IsNull() } });
    const elderIds = elders.map((e) => e.id);
    const deviceIds = bindings.map((b) => b.deviceId);
    const devices = deviceIds.length > 0 ? await deviceRepo.findByIds(deviceIds) : [];
    const deviceMap = new Map(devices.map((d) => [d.id, d]));
    const pendingEvents = await eventRepo
      .createQueryBuilder('e')
      .where('e.orgId = :orgId', { orgId: user.orgId })
      .andWhere('e.elderId IN (:...elderIds)', { elderIds })
      .andWhere('e.status = :status', { status: 'PENDING_CHECK' })
      .getMany();

    const bedIds = elders.map((e) => e.bedLocationId).filter((id): id is string => id != null);
    const beds = bedIds.length > 0 ? await locationRepo.findByIds(bedIds) : [];
    const bedMap = new Map(beds.map((b) => [b.id, b.name]));

    const list: ElderOverviewItem[] = elders.map((elder) => {
      const binding = bindings.find((b) => b.elderId === elder.id);
      const device = binding ? deviceMap.get(binding.deviceId) ?? null : null;
      const pendingCount = pendingEvents.filter((e) => e.elderId === elder.id).length;

      let monitorStatus: ElderOverviewItem['monitorStatus'];
      if (pendingCount > 0) {
        monitorStatus = 'PENDING_CHECK';
      } else if (!device || device.onlineStatus === 'OFFLINE' || device.onlineStatus === 'UNKNOWN') {
        // R005：设备离线/未绑定 → 离线/未知，不显示正常
        monitorStatus = 'OFFLINE_UNKNOWN';
      } else {
        monitorStatus = 'NORMAL';
      }

      return {
        elderId: elder.id,
        elderName: elder.name,
        bedLabel: elder.bedLocationId ? bedMap.get(elder.bedLocationId) ?? null : null,
        careLevel: elder.careLevel,
        monitorStatus,
        deviceId: device?.id ?? null,
        deviceNo: device?.deviceNo ?? null,
        deviceOnlineStatus: device?.onlineStatus ?? null,
        pendingEventCount: pendingCount,
      };
    });
    return { list };
  }
}