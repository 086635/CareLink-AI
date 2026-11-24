import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CareEventEntity,
  CareLocationEntity,
  CareTaskEntity,
  DeviceEntity,
  ElderEntity,
} from '../../infra/typeorm/entities';

export interface DashboardData {
  inCareElders: number;
  onlineDevices: number;
  totalDevices: number;
  pendingTasks: number;
  timeoutTasks: number;
  bedStatus: { free: number; occupied: number };
  recentEvents: {
    id: string;
    eventType: string;
    status: string;
    elderId: string | null;
    triggeredAt: string;
    simulated: boolean;
  }[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ElderEntity)
    private readonly elderRepo: Repository<ElderEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    @InjectRepository(CareTaskEntity)
    private readonly taskRepo: Repository<CareTaskEntity>,
    @InjectRepository(CareLocationEntity)
    private readonly locationRepo: Repository<CareLocationEntity>,
    @InjectRepository(CareEventEntity)
    private readonly eventRepo: Repository<CareEventEntity>,
  ) {}

  async dashboard(orgId: string): Promise<DashboardData> {
    const [inCareElders, onlineDevices, totalDevices, pendingTasks, timeoutTasks, freeBeds, occupiedBeds, recentEvents] =
      await Promise.all([
        this.elderRepo.count({ where: { orgId, status: 'IN_CARE' } }),
        this.deviceRepo.count({ where: { orgId, onlineStatus: 'ONLINE', status: 'ACTIVE' } }),
        this.deviceRepo.count({ where: { orgId, status: 'ACTIVE' } }),
        this.taskRepo.count({ where: { orgId, status: In(['UNASSIGNED', 'UNCLAIMED', 'PROCESSING']) } }),
        this.taskRepo.count({ where: { orgId, timeoutFlag: true, status: In(['UNASSIGNED', 'UNCLAIMED', 'PROCESSING']) } }),
        this.locationRepo.count({ where: { orgId, level: 'BED', bedStatus: 'FREE' } }),
        this.locationRepo.count({ where: { orgId, level: 'BED', bedStatus: 'OCCUPIED' } }),
        this.eventRepo.find({
          where: { orgId },
          order: { createdAt: 'DESC' },
          take: 10,
        }),
      ]);

    return {
      inCareElders,
      onlineDevices,
      totalDevices,
      pendingTasks,
      timeoutTasks,
      bedStatus: { free: freeBeds, occupied: occupiedBeds },
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        status: e.status,
        elderId: e.elderId,
        triggeredAt: e.triggeredAt.toISOString(),
        simulated: e.simulated,
      })),
    };
  }
}