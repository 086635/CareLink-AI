import axios from 'axios';

interface CliOptions {
  api: string;
  account: string;
  password: string;
  count: number;
  durationSeconds: number;
  intervalMs: number;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const get = (key: string, fallback: string): string => {
    const idx = args.indexOf(`--${key}`);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  return {
    api: get('api', 'http://localhost:3000/api'),
    account: get('account', 'admin'),
    password: get('password', 'admin123'),
    count: Number(get('count', '100')),
    durationSeconds: Number(get('duration', '600')),
    intervalMs: Number(get('interval', '8000')),
  };
}

interface SimDevice {
  deviceNo: string;
  deviceKey: string;
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const client = axios.create({ baseURL: opts.api, timeout: 10000 });

  console.log(`[simulator-cli] 登录管理端...`);
  const loginRes = await client.post('/v1/auth/login', {
    account: opts.account,
    password: opts.password,
  });
  const token = loginRes.data.data.accessToken as string;
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log(`[simulator-cli] 创建 ${opts.count} 台模拟设备...`);
  const devices: SimDevice[] = [];
  for (let i = 0; i < opts.count; i++) {
    const deviceNo = `SIM-LOAD-${Date.now()}-${i}`;
    const res = await client.post(
      '/v1/simulator/devices',
      { deviceNo },
      { headers: authHeaders },
    );
    devices.push({
      deviceNo,
      deviceKey: res.data.data.deviceKey as string,
    });
  }

  console.log(`[simulator-cli] 开始压测：${devices.length} 台设备 × ${opts.durationSeconds} 秒，间隔 ${opts.intervalMs}ms`);
  const startTime = Date.now();
  const endTime = startTime + opts.durationSeconds * 1000;
  let success = 0;
  let failure = 0;

  const workers = devices.map(async (device) => {
    while (Date.now() < endTime) {
      const isMoisture = Math.random() < 0.2;
      try {
        await client.post(
          '/v1/device/readings',
          {
            deviceNo: device.deviceNo,
            collectedAt: new Date().toISOString(),
            metricType: 'MOISTURE',
            metricValue: isMoisture ? 80 : 30,
          },
          { headers: { 'X-Device-Key': device.deviceKey } },
        );
        success++;
      } catch {
        failure++;
      }
      await new Promise((r) => setTimeout(r, opts.intervalMs + Math.random() * 2000));
    }
  });

  await Promise.all(workers);

  console.log(`[simulator-cli] 压测结束：成功 ${success} 次，失败 ${failure} 次，耗时 ${Math.round((Date.now() - startTime) / 1000)} 秒`);
  if (failure > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[simulator-cli] 运行失败:', err.message);
  process.exit(1);
});