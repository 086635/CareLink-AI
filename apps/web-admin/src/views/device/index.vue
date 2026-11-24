<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <span>监测设备管理</span>
          <el-button v-if="canManage" type="primary" @click="openCreate">注册设备</el-button>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column prop="deviceNo" label="设备编号" width="180" />
        <el-table-column prop="deviceType" label="类型" width="120" />
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.source === 'SIMULATED'" type="warning" size="small">模拟</el-tag>
            <el-tag v-else size="small">真实</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="onlineStatus" label="在线状态" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.onlineStatus === 'ONLINE'" type="success" size="small">在线</el-tag>
            <el-tag v-else-if="row.onlineStatus === 'OFFLINE'" type="danger" size="small">离线</el-tag>
            <el-tag v-else type="info" size="small">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="battery" label="电量" width="90">
          <template #default="{ row }">{{ row.battery != null ? row.battery + '%' : '—' }}</template>
        </el-table-column>
        <el-table-column prop="lastSeenAt" label="最后通信" width="180">
          <template #default="{ row }">{{ row.lastSeenAt ? formatTime(row.lastSeenAt) : '—' }}</template>
        </el-table-column>
        <el-table-column label="绑定老人" width="140">
          <template #default="{ row }">{{ boundElder(row.id) ?? '未绑定' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canManage && !boundElder(row.id)" link type="primary" size="small" @click="openBind(row)">绑定</el-button>
            <el-button v-if="canManage && boundElder(row.id)" link type="danger" size="small" @click="onUnbind(row)">解绑</el-button>
            <el-button link type="primary" size="small" @click="openHistory(row)">绑定历史</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createDialog.visible" title="注册设备" width="460px">
      <el-form :model="createDialog.form" label-width="90px">
        <el-form-item label="设备编号">
          <el-input v-model="createDialog.form.deviceNo" placeholder="全局唯一" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="createDialog.form.deviceType" style="width: 100%">
            <el-option label="智能纸尿裤传感器" value="DIAPER_SENSOR" />
            <el-option label="其他感知设备" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-radio-group v-model="createDialog.form.source">
            <el-radio value="REAL">真实设备</el-radio>
            <el-radio value="SIMULATED">模拟设备</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="createDialog.loading" @click="onCreate">注册</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bindDialog.visible" title="绑定老人" width="420px">
      <el-select v-model="bindDialog.elderId" filterable placeholder="选择在护老人" style="width: 100%">
        <el-option v-for="e in elders" :key="e.id" :label="`${e.name}（${e.bedLabel ?? '未分床'}）`" :value="e.id" />
      </el-select>
      <template #footer>
        <el-button @click="bindDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="bindDialog.loading" @click="onBind">绑定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="historyDialog.visible" title="绑定历史（解绑后记录保留，R003）" width="560px">
      <el-table :data="historyDialog.rows" border>
        <el-table-column prop="elderName" label="老人" width="120" />
        <el-table-column prop="startedAt" label="绑定时间" width="180">
          <template #default="{ row }">{{ formatTime(row.startedAt) }}</template>
        </el-table-column>
        <el-table-column prop="endedAt" label="解绑时间" width="180">
          <template #default="{ row }">{{ row.endedAt ? formatTime(row.endedAt) : '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.active" type="success" size="small">有效</el-tag>
            <el-tag v-else type="info" size="small">已解绑</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="keyDialog.visible" title="设备密钥（仅显示一次，请妥善保存）" width="480px">
      <el-alert type="warning" :closable="false" title="device_key 仅在注册时返回一次，服务端只保存哈希" style="margin-bottom: 12px" />
      <el-input :model-value="keyDialog.key" readonly>
        <template #append>
          <el-button @click="copyKey">复制</el-button>
        </template>
      </el-input>
    </el-dialog>

    <SimulatorPanel style="margin-top: 12px" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserRole } from '@carelink/shared-types';
import type { DeviceDto, ElderDto } from '@carelink/shared-types';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';
import SimulatorPanel from './simulator-panel.vue';

const auth = useAuthStore();
const canManage = computed(() => auth.user?.role === UserRole.ADM || auth.user?.role === UserRole.SUP);

const list = ref<DeviceDto[]>([]);
const elders = ref<ElderDto[]>([]);
const bindingMap = ref<Record<string, { elderName: string; bindingId: string }>>({});

const createDialog = reactive({
  visible: false,
  loading: false,
  form: { deviceNo: '', deviceType: 'DIAPER_SENSOR', source: 'REAL' as 'REAL' | 'SIMULATED' },
});

const bindDialog = reactive({
  visible: false,
  loading: false,
  deviceId: '',
  elderId: '',
});

const historyDialog = reactive({
  visible: false,
  rows: [] as { elderName: string; startedAt: string; endedAt: string | null; active: boolean }[],
});

const keyDialog = reactive({ visible: false, key: '' });

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

function boundElder(deviceId: string): string | null {
  return bindingMap.value[deviceId]?.elderName ?? null;
}

async function load() {
  const res = await http.get<DeviceDto[]>('/v1/devices');
  list.value = res.data;
  bindingMap.value = {};
  await Promise.all(
    res.data.map(async (device) => {
      const history = await http.get<
        { elderName: string; startedAt: string; endedAt: string | null; active: boolean; id: string }[]
      >(`/v1/devices/${device.id}/bindings`);
      const activeBinding = history.data.find((b) => b.active);
      if (activeBinding) {
        bindingMap.value[device.id] = { elderName: activeBinding.elderName, bindingId: activeBinding.id };
      }
    }),
  );
}

onMounted(async () => {
  await load();
  const elderRes = await http.get<ElderDto[]>('/v1/elders');
  elders.value = elderRes.data;
});

function openCreate() {
  createDialog.form = { deviceNo: '', deviceType: 'DIAPER_SENSOR', source: 'REAL' };
  createDialog.visible = true;
}

async function onCreate() {
  createDialog.loading = true;
  try {
    const res = await http.post<{ deviceKey: string }>('/v1/devices', createDialog.form);
    createDialog.visible = false;
    keyDialog.key = res.data.deviceKey;
    keyDialog.visible = true;
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    createDialog.loading = false;
  }
}

function copyKey() {
  void navigator.clipboard.writeText(keyDialog.key);
  ElMessage.success('已复制');
}

function openBind(device: DeviceDto) {
  bindDialog.deviceId = device.id;
  bindDialog.elderId = '';
  bindDialog.visible = true;
}

async function onBind() {
  if (!bindDialog.elderId) {
    ElMessage.warning('请选择老人');
    return;
  }
  bindDialog.loading = true;
  try {
    await http.post(`/v1/devices/${bindDialog.deviceId}/bindings`, { elderId: bindDialog.elderId });
    bindDialog.visible = false;
    await load();
    ElMessage.success('绑定成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    bindDialog.loading = false;
  }
}

async function onUnbind(device: DeviceDto) {
  try {
    await ElMessageBox.confirm(`确认解绑设备 ${device.deviceNo}？解绑后历史记录保留（R003）`, '解绑确认');
  } catch {
    return;
  }
  const binding = bindingMap.value[device.id];
  if (!binding) return;
  try {
    await http.put(`/v1/devices/${device.id}/bindings/${binding.bindingId}`);
    await load();
    ElMessage.success('解绑成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

async function openHistory(device: DeviceDto) {
  const res = await http.get<
    { elderName: string; startedAt: string; endedAt: string | null; active: boolean }[]
  >(`/v1/devices/${device.id}/bindings`);
  historyDialog.rows = res.data;
  historyDialog.visible = true;
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>