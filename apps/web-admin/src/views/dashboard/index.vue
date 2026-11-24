<template>
  <div class="dashboard">
    <el-row :gutter="12">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value" :class="card.colorClass">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>床位状态分布</template>
          <div class="bed-stats">
            <div class="bed-item">
              <span class="bed-num occupied">{{ data?.bedStatus.occupied ?? 0 }}</span>
              <span class="bed-label">在护</span>
            </div>
            <div class="bed-item">
              <span class="bed-num free">{{ data?.bedStatus.free ?? 0 }}</span>
              <span class="bed-label">空闲</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="alert-header">
              <span>实时照护事件</span>
              <el-tag v-if="connected" type="success" size="small">实时连接中</el-tag>
              <el-tag v-else type="info" size="small">未连接</el-tag>
            </div>
          </template>
          <el-table :data="data?.recentEvents ?? []" border size="small">
            <el-table-column prop="eventType" label="类型" width="110">
              <template #default="{ row }">
                <el-tag v-if="row.eventType === 'MOISTURE'" type="warning" size="small">疑似尿湿</el-tag>
                <el-tag v-else type="danger" size="small">设备故障</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">{{ statusLabel(row.status) }}</template>
            </el-table-column>
            <el-table-column prop="elderId" label="老人ID" width="120">
              <template #default="{ row }">{{ row.elderId ?? '（设备级）' }}</template>
            </el-table-column>
            <el-table-column prop="triggeredAt" label="触发时间" min-width="160">
              <template #default="{ row }">{{ formatTime(row.triggeredAt) }}</template>
            </el-table-column>
            <el-table-column label="来源" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.simulated" type="info" size="small">模拟</el-tag>
                <el-tag v-else size="small">真实</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { createSocket, type ServerSocket } from '@carelink/api-client';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';

interface DashboardData {
  inCareElders: number;
  onlineDevices: number;
  totalDevices: number;
  pendingTasks: number;
  timeoutTasks: number;
  bedStatus: { free: number; occupied: number };
  recentEvents: {
    id: string;
    eventType: string;
    status: string;
    elderId: string | null;
    triggeredAt: string;
    simulated: boolean;
  }[];
}

const auth = useAuthStore();
const data = ref<DashboardData | null>(null);
const connected = ref(false);
let socket: ServerSocket | null = null;

const cards = computed(() => [
  { label: '在护老人', value: data.value?.inCareElders ?? 0, colorClass: 'blue' },
  { label: `在线设备（${data.value?.totalDevices ?? 0} 台）`, value: data.value?.onlineDevices ?? 0, colorClass: 'green' },
  { label: '待处理任务', value: data.value?.pendingTasks ?? 0, colorClass: 'orange' },
  { label: '超时任务', value: data.value?.timeoutTasks ?? 0, colorClass: data.value && data.value.timeoutTasks > 0 ? 'red' : 'blue' },
]);

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING_CHECK':
      return '待核查';
    case 'PROCESSING':
      return '处理中';
    case 'COMPLETED':
      return '已完成';
    case 'FALSE_ALARM_CLOSED':
      return '误报关闭';
    default:
      return status;
  }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

async function load() {
  const res = await http.get<DashboardData>('/v1/analytics/dashboard');
  data.value = res.data;
}

onMounted(() => {
  void load();
  socket = createSocket(() => auth.token);
  socket.on('connect', () => {
    connected.value = true;
  });
  socket.on('disconnect', () => {
    connected.value = false;
  });
  socket.on('event:created', () => {
    void load();
  });
  socket.on('dashboard:refresh', () => {
    void load();
  });
  socket.on('device:offline', () => {
    void load();
  });
  socket.connect();
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>

<style scoped>
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-value.blue { color: #409eff; }
.stat-value.green { color: #67c23a; }
.stat-value.orange { color: #e6a23c; }
.stat-value.red { color: #f56c6c; }
.stat-label {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}
.bed-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
}
.bed-item {
  text-align: center;
}
.bed-num {
  display: block;
  font-size: 32px;
  font-weight: 700;
}
.bed-num.occupied { color: #409eff; }
.bed-num.free { color: #909399; }
.bed-label {
  color: #909399;
  font-size: 13px;
}
.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>