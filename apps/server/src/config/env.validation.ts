export interface EnvConfig {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
    password: string | null;
  };
  jwtSecret: string;
  jwtExpiresIn: string;
  deviceKeySalt: string;
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}

export function loadEnv(): EnvConfig {
  const required: string[] = [
    'DATABASE_HOST',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'REDIS_HOST',
    'JWT_SECRET',
    'DEVICE_KEY_SALT',
    'LLM_BASE_URL',
    'LLM_API_KEY',
    'LLM_MODEL',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`缺少必填环境变量，拒绝启动: ${missing.join(', ')}（参考 deploy/.env.example）`);
  }
  return {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER ?? 'carelink',
      password: process.env.DATABASE_PASSWORD ?? '',
      name: process.env.DATABASE_NAME ?? 'carelink',
    },
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || null,
    },
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '2h',
    deviceKeySalt: process.env.DEVICE_KEY_SALT as string,
    llm: {
      baseUrl: process.env.LLM_BASE_URL as string,
      apiKey: process.env.LLM_API_KEY as string,
      model: process.env.LLM_MODEL as string,
    },
  };
}