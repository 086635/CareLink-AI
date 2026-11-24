import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity } from '../../../infra/typeorm/entities';
import { DeviceService } from '../../device/device.service';
import { GatewayService } from '../gateway.service';

export type ScriptName = 'NORMAL' | 'MOISTURE' | 'REPEAT' | 'OFFLINE' | 'LOW_BATTERY';

interface RunningScript {
  deviceId: string;
  script: ScriptName;
  timer: ReturnType<typeof setInterval> | null;
}

@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly running = new Map<string, RunningScript>();

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepo: Repository<DeviceEntity>,
    private readonly deviceService: DeviceService,
    private readonly gatewayService: GatewayService,
  ) {}

  async createSimulatedDevice(
    orgId: string,
    deviceNo?: string,
  ): Promise<{ device: DeviceEntity; deviceKey: string }> {
    const no = deviceNo ?? `SIM-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return this.deviceService.create(orgId, {
      deviceNo: no,
      deviceType: 'DIAPER_SENSOR',
      source: 'SIMULATED',
    });
  }

  async startScript(deviceId: string, script: ScriptName): Promise<{ started: boolean }> {
    await this.stopScript(deviceId);
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device || device.source !== 'SIMULATED') {
      throw new Error('仅模拟设备可运行剧本');
    }

    const entry: RunningScript = { deviceId, script, timer: null };
    this.running.set(deviceId, entry);

    switch (script) {
      case 'NORMAL':
        entry.timer = setInterval(() => {
          void this.sendReading(device, 'MOISTURE', 30);
          void this.sendHeartbeat(device, 85);
        }, 10_000);
        void this.sendReading(device, 'MOISTURE', 30);
        break;
      case 'MOISTURE':
        void this.sendReading(device, 'MOISTURE', 80);
        void this.sendHeartbeat(device, 85);
        break;
      case 'REPEAT':
        entry.timer = setInterval(() => {
          void this.sendReading(device, 'MOISTURE', 80);
        }, 3_000);
        void this.sendReading(device, 'MOISTURE', 80);
        break;
      case 'OFFLINE':
        // 停止一切上报，由离线扫描检测（AC07）
        break;
      case 'LOW_BATTERY':
        void this.sendReading(device, 'BATTERY', 15);
        void this.sendHeartbeat(device, 15);
        entry.timer = setInterval(() => {
          void this.sendHeartbeat(device, 15);
        }, 10_000);
        break;
    }
    this.logger.log(`模拟设备 ${device.deviceNo} 启动剧本 ${script}`);
    return { started: true };
  }

  async stopScript(deviceId: string): Promise<{ stopped: boolean }> {
    const entry = this.running.get(deviceId);
    if (entry?.timer) {
      clearInterval(entry.timer);
    }
    this.running.delete(deviceId);
    return { stopped: true };
  }

  listRunning(): { deviceId: string; script: ScriptName }[] {
    return [...this.running.values()].map((e) => ({ deviceId: e.deviceId, script: e.script }));
  }

  onModuleDestroy(): void {
    for (const entry of this.running.values()) {
      if (entry.timer) clearInterval(entry.timer);
    }
    this.running.clear();
  }

  private async sendReading(
    device: DeviceEntity,
    metricType: 'MOISTURE' | 'BATTERY',
    metricValue: number,
  ): Promise<void> {
    try {
      await this.gatewayService.ingestReading(device, {
        collectedAt: new Date().toISOString(),
        metricType,
        metricValue,
      });
    } catch (err) {
      this.logger.warn(`模拟读数失败: ${(err as Error).message}`);
    }
  }

  private async sendHeartbeat(device: DeviceEntity, battery: number): Promise<void> {
    try {
      await this.gatewayService.ingestHeartbeat(device, { battery });
    } catch (err) {
      this.logger.warn(`模拟心跳失败: ${(err as Error).message}`);
    }
  }
}