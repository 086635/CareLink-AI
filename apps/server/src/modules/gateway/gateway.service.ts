import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity, SensorReadingEntity } from '../../infra/typeorm/entities';
import { RedisService } from '../../infra/redis/redis.service';
import { IdentifyService, IncomingReading, IdentifyResult } from '../event/identify.service';
import { BusinessException } from '../../common/errors/business.exception';

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const METRIC_RANGE: Record<string, { min: number; max: number }> = {
  MOISTURE: { min: 0, max: 100 },
  BATTERY: { min: 0, max: 100 },
  HEARTBEAT: { min: 0, max: 1 },
};

export interface ReadingBody {
  collectedAt: string;
  metricType: 'MOISTURE' | 'BATTERY' | 'HEARTBEAT';
  metricValue: number;
}

export interface HeartbeatBody {
  battery?: number;
}

@Injectable()
export class GatewayService {
  constructor(
    @InjectRepository(SensorReadingEntity)
    private readonly readingRepo: Repository<SensorReadingEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly redis: RedisService,
    private readonly identifyService: IdentifyService,
  ) {}

  async ingestReading(device: DeviceEntity, body: ReadingBody): Promise<IdentifyResult> {
    const collectedAt = new Date(body.collectedAt);
    if (Number.isNaN(collectedAt.getTime())) {
      throw BusinessException.badRequest('collectedAt 不是合法时间');
    }
    if (collectedAt.getTime() - Date.now() > MAX_FUTURE_SKEW_MS) {
      throw BusinessException.badRequest('collectedAt 超出合理范围');
    }
    const range = METRIC_RANGE[body.metricType];
    if (!range || body.metricValue < range.min || body.metricValue > range.max) {
      throw BusinessException.badRequest('metricValue 超出合理范围');
    }

    const quality: 'NORMAL' | 'INVALID' = Number.isFinite(body.metricValue) ? 'NORMAL' : 'INVALID';
    const simulated = device.source === 'SIMULATED';

    await this.readingRepo.save({
      deviceId: device.id,
      collectedAt,
      receivedAt: new Date(),
      metricType: body.metricType,
      metricValue: body.metricValue,
      quality,
      simulated,
    });

    await this.updateOnlineSnapshot(device, body.metricType, body.metricValue);

    const incoming: IncomingReading = {
      metricType: body.metricType,
      metricValue: body.metricValue,
      collectedAt,
      quality,
    };
    const result = await this.identifyService.processReading(device, incoming);
    return result;
  }

  async ingestHeartbeat(device: DeviceEntity, body: HeartbeatBody): Promise<{ accepted: boolean }> {
    const now = new Date();
    const simulated = device.source === 'SIMULATED';
    if (body.battery != null) {
      await this.readingRepo.save({
        deviceId: device.id,
        collectedAt: now,
        receivedAt: now,
        metricType: 'BATTERY',
        metricValue: body.battery,
        quality: 'NORMAL',
        simulated,
      });
    }
    await this.updateOnlineSnapshot(device, 'HEARTBEAT', 1, body.battery ?? null);
    return { accepted: true };
  }

  private async updateOnlineSnapshot(
    device: DeviceEntity,
    metricType: string,
    metricValue: number,
    battery?: number | null,
  ): Promise<void> {
    const now = new Date();
    const wasOffline = device.onlineStatus !== 'ONLINE';
    await this.deviceRepo.update(device.id, {
      onlineStatus: 'ONLINE',
      lastSeenAt: now,
      ...(battery != null ? { battery } : {}),
    });
    await this.redis.setDeviceSnapshot(device.id, {
      lastSeen: now.toISOString(),
      metricType,
      metricValue,
      battery: battery ?? device.battery,
      simulated: device.source === 'SIMULATED',
    });
    if (wasOffline) {
      device.onlineStatus = 'ONLINE';
    }
  }
}