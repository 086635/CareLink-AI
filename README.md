# CareLink-AI 智护无忧

AIoT 老年智能照护管理平台（华为 ICT 大赛项目）——以智能纸尿裤为感知入口，以老年失禁照护为核心场景，实现从被动人工巡查向主动智能照护的转变。

**硬件负责发现问题，软件负责组织解决问题，AI 负责辅助理解问题和改善照护方式。**

## 产品形态

| 端 | 技术 | 说明 |
|----|------|------|
| 后端 | NestJS 10 + TypeORM + MySQL 8.0 + Redis + Socket.IO | 唯一业务规则实现处，15 个业务模块 |
| PC 管理端 | Vue 3 + Element Plus + ECharts + Pinia | 照护总览 / 护理工作台 / 老人档案 / 智能照护 / 设备中心 / 运营管理 / 系统设置 |
| 护理员 H5 | Vue 3 + Vant 4 | 今日待办 / 在护老人 / 任务处理 / 交接班 / 我的（复用后端 API 与业务规则） |
| 设备模拟器 | 服务端剧本 + 压测 CLI | 5 个剧本一键复现验收场景，支持 100 台设备并发压测 |

## 核心业务闭环

```
设备感知 → 事件识别（去重）→ 任务生成 → 认领/执行 → 护理记录 → 个体规律分析 → 优化下一次护理
```

四类核心数据严格区分：**传感器数据 / 护理事件 / 护理任务 / 护理记录**。

## 快速启动（本地开发）

### 前置要求

- Node.js ≥ 20（开发环境实测 Node 24）
- pnpm ≥ 10
- MySQL 8.0（本地或华为云 RDS）
- Redis 5.x+（本地或华为云 DCS）

### 步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量（参考 deploy/.env.example，必填项缺失会拒绝启动）
cp deploy/.env.example apps/server/.env
# 编辑 apps/server/.env 填入 DATABASE_*/REDIS_*/JWT_SECRET/LLM_*/DEVICE_KEY_SALT

# 3. 初始化数据库（18 张表 + 软唯一约束 + 默认规则）
pnpm migration:run

# 4. 启动后端（:3000）
pnpm dev:server

# 5. 启动 PC 管理端（:5173，代理 /api 与 /ws）
pnpm dev:web

# 6. 启动护理员 H5（:5174，代理 /api 与 /ws）
pnpm dev:h5
```

### 初始账号

首次使用需在数据库中创建机构与管理员账号（密码为 bcrypt 哈希），或执行种子脚本。示例 SQL：

```sql
INSERT INTO organization (name, status) VALUES ('演示养老院', 'ENABLED');
INSERT INTO caregiver (org_id, name, phone, account, password_hash, role, on_duty, status)
VALUES (1, '管理员', '13800000000', 'admin', '<bcrypt-hash-of-admin123>', 'ADM', 1, 'ACTIVE');
```

bcrypt 哈希生成：`node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"`

## 设备模拟与验收场景

设备中心 → 模拟器面板：一键创建模拟设备（返回 device_key，仅显示一次），选择剧本：

| 剧本 | 验证场景 |
|------|---------|
| NORMAL | AC01：正常信号不生成事件任务 |
| MOISTURE | AC02：尿湿信号生成待核查事件 + 任务，3 秒内提醒 |
| REPEAT | AC03：同周期连续信号合并至同一事件，不重复生成任务 |
| OFFLINE | AC07：停止心跳后离线检测 + 故障事件 + 人工检查提醒 |
| LOW_BATTERY | 低电量设备异常提醒 |

100 台并发压测（NFR-002）：

```bash
pnpm --filter @carelink/simulator-cli build
node apps/simulator-cli/dist/index.js --api http://localhost:3000/api --account admin --password admin123 --count 100 --duration 600
```

## 华为云部署

完整部署步骤（RDS / DCS / ECS / Nginx / PM2 / CodeArts 流水线 / 备份恢复演练）见 [docs/deploy.md](docs/deploy.md)。

## 项目结构

```
apps/
  server/          # NestJS 后端（唯一业务规则实现处）
  web-admin/       # PC 管理端（Vue3 + Element Plus）
  h5-caregiver/    # 护理员 H5（Vue3 + Vant）
  simulator-cli/   # 设备压测 CLI
packages/
  shared-types/    # 前后端唯一类型契约（DTO/枚举/Zod，禁用 any）
  api-client/      # 统一 API 客户端（JWT 注入/错误码解析/Socket 封装）
deploy/            # Nginx / PM2 / 环境变量示例
docs/              # SPEC / 部署文档
```

## 需求与设计文档

- [docs/SPEC.md](docs/SPEC.md) - 需求规格（77 条 FR / R001-R027 / NFR / AC01-AC14）
- `.codeartsdoer/specs/carelink_mvp/` - design.md（技术设计）与 tasks.md（任务规划）

## License

MIT