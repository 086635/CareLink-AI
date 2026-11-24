import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { DeviceEntity, DeviceBindingEntity, ElderEntity } from '../../infra/typeorm/entities';
import { BusinessException } from '../../common/errors/business.exception';

export function hashDeviceKey(deviceKey: string): string {
  const salt = process.env.DEVICE_KEY_SALT as string;
  return createHash('sha256').update(`${salt}:${deviceKey}`).digest('hex');
}

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
  ) {}

  async create(
    orgId: string,
    data: { deviceNo: string; deviceType: string; source: 'REAL' | 'SIMULATED' },
  ): Promise<{ device: DeviceEntity; deviceKey: string }> {
    const deviceKey = `dev_${randomBytes(16).toString('hex')}`;
    const entity = this.deviceRepo.create({
      orgId,
      deviceNo: data.deviceNo,
      deviceType: data.deviceType,
      source: data.source,
      deviceKeyHash: hashDeviceKey(deviceKey),
    });
    try {
      const device = await this.deviceRepo.save(entity);
      return { device, deviceKey };
    } catch (err) {
      throw BusinessException.badRequest(`创建失败（设备编号全局唯一）: ${(err as Error).message}`);
    }
  }

  async update(
    id: string,
    orgId: string,
    data: { deviceType?: string; status?: 'ACTIVE' | 'RETIRED' },
  ): Promise<DeviceEntity> {
    const device = await this.deviceRepo.findOne({ where: { id, orgId } });
    if (!device) {
      throw BusinessException.notFound('设备不存在');
    }
    if (data.deviceType != null) device.deviceType = data.deviceType;
    if (data.status != null) device.status = data.status;
    return this.deviceRepo.save(device);
  }

  async list(orgId: string): Promise<unknown[]> {
    const devices = await this.deviceRepo.find({ where: { orgId }, order: { id: 'ASC' } });
    return devices.map((d) => ({
      id: d.id,
      orgId: d.orgId,
      deviceNo: d.deviceNo,
      deviceType: d.deviceType,
      source: d.source,
      onlineStatus: d.onlineStatus,
      lastSeenAt: d.lastSeenAt,
      battery: d.battery,
      status: d.status,
    }));
  }

  async findById(id: string, orgId: string): Promise<DeviceEntity> {
    const device = await this.deviceRepo.findOne({ where: { id, orgId } });
    if (!device) {
      throw BusinessException.notFound('设备不存在');
    }
    return device;
  }

  async findByDeviceNo(deviceNo: string): Promise<DeviceEntity | null> {
    return this.deviceRepo.findOne({ where: { deviceNo } });
  }

  async verifyDeviceKey(device: DeviceEntity, deviceKey: string): Promise<boolean> {
    return hashDeviceKey(deviceKey) === device.deviceKeyHash;
  }
}