# CareLink-AI 智护无忧 · 华为云部署文档

本文档描述从零开始在华为云部署 CareLink-AI 全套环境（ECS + RDS + DCS Redis + Nginx + PM2）的完整步骤，并包含备份恢复演练（AC13 验证路径）与公网验收（AC14）。

## 1. 资源清单与开通（8.1）

| 资源 | 规格 | 用途 | 安全组要求 |
|------|------|------|-----------|
| ECS | 2 核 4G，公网 IP，带宽 ≥5M | Nginx + Node.js（PM2 集群） | 80/443 对公网开放；22 限源 IP |
| RDS for MySQL | 8.0，单机主备 | 全部业务数据（唯一可信源，NFR-004） | 3306 仅内网互通 + 密码认证 |
| DCS Redis | 5.x 主备 2G | 在线快照/会话白名单/看板缓存/去重辅助锁 | 6379 仅内网互通 + 密码认证 |

开通步骤（控制台操作）：

1. **RDS**：购买实例（MySQL 8.0，单机主备）→ 开启自动备份（每日全量 + binlog，保留 7 天）→ 创建数据库 `carelink` 与账号 `carelink` → 内网地址记为 `RDS_HOST`。
2. **DCS Redis**：购买主备实例（2G）→ 设置密码 → 内网地址记为 `REDIS_HOST`。
3. **ECS**：购买实例（Node.js 环境见第 2 节）→ 绑定公网 IP → 安全组放行 80/443，22 限源 IP；3306/6379 不对公网开放。
4. **证书**：申请免费 DV 证书（或演示用自签名证书），上传至 ECS `/etc/nginx/ssl/`。

## 2. ECS 环境准备

```bash
# Node.js 20+（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm / pm2 / nginx
sudo npm install -g pnpm pm2
sudo apt-get install -y nginx

# 项目代码（CodeArts Repo 或 GitHub/Gitee）
sudo mkdir -p /opt/carelink && sudo chown $USER /opt/carelink
git clone <repo-url> /opt/carelink
cd /opt/carelink && pnpm install
```

## 3. 环境变量

```bash
cp deploy/.env.example /opt/carelink/apps/server/.env
```

编辑 `/opt/carelink/apps/server/.env`（必填项缺失会拒绝启动，1.5 强校验）：

| 变量 | 说明 |
|------|------|
| DATABASE_HOST/PORT/USER/PASSWORD/NAME | RDS 内网连接串 |
| REDIS_HOST/PORT/PASSWORD | DCS 内网连接串 |
| JWT_SECRET | 随机 ≥32 字符 |
| DEVICE_KEY_SALT | 随机 ≥16 字符 |
| LLM_BASE_URL/API_KEY/MODEL | OpenAI 兼容服务（ModelArts 或任意兼容端点） |
| NODE_ENV=production | 生产模式 |

## 4. 首次建库（Migration）

```bash
cd /opt/carelink
pnpm migration:run
# 18 张表 + 3 条软唯一约束 + 默认规则（rule_config）创建成功
# 重复执行幂等安全
```

创建初始机构与管理员账号（见 README「初始账号」），随后立即在系统设置中修改默认密码。

## 5. 构建与启动

```bash
# 构建全部产物（shared-types → api-client → server/web-admin/h5）
pnpm build

# 部署静态产物
mkdir -p /opt/carelink/web-admin /opt/carelink/h5-caregiver
cp -r apps/web-admin/dist/* /opt/carelink/web-admin/
cp -r apps/h5-caregiver/dist/* /opt/carelink/h5-caregiver/

# PM2 集群启动后端（2 实例）
cd apps/server && pm2 start ../../deploy/ecosystem.config.js && pm2 save
pm2 startup  # 开机自启
```

## 6. Nginx 配置

```bash
sudo cp deploy/nginx/carelink.conf /etc/nginx/conf.d/
# 编辑 server_name 与证书路径后：
sudo nginx -t && sudo systemctl reload nginx
```

配置要点（deploy/nginx/carelink.conf）：
- `:80` → 301 跳转 `:443`（HTTPS 强制）
- `/api/` 反代 `127.0.0.1:3000`
- `/ws/` WebSocket 升级头透传（Socket.IO）
- `/` 与 `/h5/` 静态目录 + SPA history 回退

## 7. 验证清单

| 验证项 | 方法 | 预期 |
|--------|------|------|
| 健康检查 | `curl https://<ip>/api/health` | `{"code":0,"data":{"status":"ok"}}` |
| PC 管理端 | 浏览器访问 `https://<ip>/` | 登录页正常 |
| 护理员 H5 | 浏览器访问 `https://<ip>/h5/` | H5 登录页正常 |
| 实时推送 | 模拟器 MOISTURE 剧本 | 页面 3 秒内出现提醒（AC02/NFR-001） |
| 并发压测 | simulator-cli 100 台 10 分钟 | 零错误、事件无丢失（NFR-002） |
| AC13 重启恢复 | `pm2 restart carelink-server` | 未完成任务与护理记录全部恢复 |

## 8. 备份恢复演练（AC13 验证路径）

1. **备份**：RDS 控制台 → 备份恢复 → 创建手动备份（或使用自动备份点）。
2. **演练恢复**：恢复到新实例 → 修改 `.env` 指向新实例 → `pm2 restart` → 验证：
   - 未完成任务仍出现在待办（R015）；
   - 护理记录逐条核对无丢失；
   - 事件/任务状态与恢复前一致。
3. **Redis 数据丢失影响**：`redis-cli FLUSHALL` 后业务数据不受影响（Redis 仅存可重建数据，NFR-004），会话需重新登录。

## 9. CodeArts 流水线（8.3）

1. **Repo**：代码托管至 CodeArts Repo（main 分支保护，禁止直推）。
2. **流水线阶段**：
   - `pnpm install --frozen-lockfile`
   - `pnpm build`（拓扑序：shared-types → api-client → server/web-admin/h5）
   - `pnpm --filter @carelink/server test`（单元测试，未通过阻断合入）
   - SSH 部署：`rsync` 静态产物 + `pm2 reload carelink-server`
3. **可重复执行**：任意 commit 触发一键构建→测试→部署，重复执行结果一致。

## 10. 开源交付（8.4 / NFR-012）

交付物清单（发布至 GitHub/Gitee）：

- [x] 全部源代码（apps/ + packages/）
- [x] pnpm-lock.yaml（依赖锁定）
- [x] deploy/（nginx 配置、PM2 配置、.env.example）
- [x] docs/（SPEC.md、deploy.md）
- [x] README.md（快速启动指南）
- [x] LICENSE（MIT）

## 11. AC14 公网最终验收

公网域名访问 PC 管理端与 H5，验证前端、后端、RDS、Redis 正常协同：

1. 登录 → 创建机构层级（楼栋/楼层/房间/床位）→ 创建老人与护理员 → 注册设备并绑定；
2. 模拟器运行 5 个剧本，逐项核对 AC01/AC02/AC03/AC07；
3. 双端（PC + H5）完成认领、快捷更换登记、误报、交接班，核对 AC04/AC05/AC06/AC08/AC09；
4. 生成 AI 交接班摘要与照护报告，核对 AC10/AC11（数据不足明示）；
5. 以越权角色访问老人档案，核对 AC12（拒绝 + 审计落库）；
6. `pm2 restart` 后核对 AC13；
7. 全部通过即完成 AC14 公网验收。