import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DeviceService } from '../device/device.service';
import { BusinessException } from '../../common/errors/business.exception';
import type { DeviceEntity } from '../../infra/typeorm/entities';

export interface DeviceRequest {
  deviceNo: string;
  device: DeviceEntity;
}

@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(private readonly deviceService: DeviceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceKey = request.headers['x-device-key'] as string | undefined;
    const deviceNo = request.body?.deviceNo as string | undefined;
    if (!deviceKey || !deviceNo) {
      throw new BusinessException(3001, '设备认证失败：缺少 X-Device-Key 或 deviceNo');
    }
    const device = await this.deviceService.findByDeviceNo(deviceNo);
    if (!device) {
      throw new BusinessException(3002, '设备不存在');
    }
    const valid = await this.deviceService.verifyDeviceKey(device, deviceKey);
    if (!valid) {
      throw new BusinessException(3001, '设备认证失败：X-Device-Key 无效');
    }
    if (device.status !== 'ACTIVE') {
      throw new BusinessException(3002, '设备已退役');
    }
    request.device = device;
    return true;
  }
}