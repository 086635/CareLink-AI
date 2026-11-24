<template>
  <el-card shadow="never">
    <template #header>
      <div class="panel-header">
        <span>设备模拟器（模拟数据全链路带标记，R006）</span>
        <el-button type="primary" size="small" :loading="creating" @click="onCreateDevice">一键创建模拟设备</el-button>
      </div>
    </template>
    <el-alert
      title="模拟剧本：NORMAL=正常信号循环；MOISTURE=触发尿湿事件；REPEAT=连续信号验证去重（AC03）；OFFLINE=停止心跳验证离线检测（AC07）；LOW_BATTERY=低电量提醒"
      type="info"
      :closable="false"
      style="margin-bottom: 12px"
    />
    <el-table :data="rows" border size="small">
      <el-table-column prop="deviceNo" label="设备编号" min-width="180" />
      <el-table-column label="运行剧本" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.script" type="success" size="small">{{ row.script }}</el-tag>
          <el-tag v-else type="info" size="small">未运行</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="320">
        <template #default="{ row }">
          <el-select
            :model-value="row.script"
            placeholder="选择剧本"
            size="small"
            style="width: 140px"
            @change="(v: string) => onStartScript(row, v)"
          >
            <el-option label="NORMAL 正常信号" value="NORMAL" />
            <el-option label="MOISTURE 尿湿触发" value="MOISTURE" />
            <el-option label="REPEAT 连续信号" value="REPEAT" />
            <el-option label="OFFLINE 停止心跳" value="OFFLINE" />
            <el-option label="LOW_BATTERY 低电量" value="LOW_BATTERY" />
          </el-select>
          <el-button
            v-if="row.script"
            link type="danger" size="small"
            @click="onStopScript(row)"
          >停止</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { http } from '@/api';

interface SimRow {
  id: string;
  deviceNo: string;
  script: string | null;
}

const rows = ref<SimRow[]>([]);
const creating = ref(false);
const keyDialog = reactive({ visible: false, key: '' });

async function load() {
  const [runningRes, devicesRes] = await Promise.all([
    http.get<{ deviceId: string; script: string }[]>('/v1/simulator/devices/running'),
    http.get<{ id: string; deviceNo: string; source: string }[]>('/v1/devices'),
  ]);
  const running = new Map(runningRes.data.map((r) => [r.deviceId, r.script]));
  rows.value = devicesRes.data
    .filter((d) => d.source === 'SIMULATED')
    .map((d) => ({
      id: d.id,
      deviceNo: d.deviceNo,
      script: running.get(d.id) ?? null,
    }));
}

onMounted(load);

async function onCreateDevice() {
  try {
    await ElMessageBox.confirm('将创建一台新的模拟设备，注册后返回设备密钥。继续？', '创建模拟设备');
  } catch {
    return;
  }
  creating.value = true;
  try {
    const res = await http.post<{ device: { deviceNo: string }; deviceKey: string }>('/v1/simulator/devices', {});
    keyDialog.key = res.data.deviceKey;
    keyDialog.visible = true;
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    creating.value = false;
  }
}

async function onStartScript(row: SimRow, script: string) {
  try {
    await http.post(`/v1/simulator/devices/${row.id}/scripts`, { script });
    await load();
    ElMessage.success(`剧本 ${script} 已启动`);
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

async function onStopScript(row: SimRow) {
  try {
    await http.post(`/v1/simulator/devices/${row.id}/scripts/stop`);
    await load();
    ElMessage.success('剧本已停止');
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>