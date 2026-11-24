<template>
  <div class="page">
    <van-nav-bar title="今日待办" />
    <van-notice-bar
      v-if="pendingCount > 0"
      :text="`您有 ${pendingCount} 项待处理任务，超时任务已标红，请优先处理`"
      left-icon="bell"
    />
    <van-pull-refresh v-model="refreshing" @refresh="load">
      <div v-if="tasks.length === 0" class="empty">
        <van-empty description="暂无待处理任务" />
      </div>
      <van-card
        v-for="task in tasks"
        :key="task.id"
        :title="`${task.elderName ?? '未关联老人'} · ${typeLabel(task.taskType)}`"
        :desc="`处理时限：${formatTime(task.deadline)}`"
      >
        <template #tags>
          <van-tag v-if="task.timeoutFlag" type="danger" style="margin-right: 6px">超时</van-tag>
          <van-tag :type="statusTagType(task.status)">{{ statusLabel(task.status) }}</van-tag>
          <van-tag v-if="task.simulated" type="default" style="margin-left: 6px">模拟</van-tag>
        </template>
        <template #footer>
          <van-button
            v-if="task.status === 'UNASSIGNED' || task.status === 'UNCLAIMED'"
            size="small"
            type="primary"
            @click="onClaim(task)"
          >接单</van-button>
          <van-button
            v-if="task.status === 'PROCESSING' || task.status === 'UNCLAIMED'"
            size="small"
            type="success"
            style="margin-left: 8px"
            @click="goProcess(task)"
          >查看任务</van-button>
        </template>
      </van-card>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showToast } from 'vant';
import type { CareTaskDto } from '@carelink/shared-types';
import { createSocket, type ServerSocket } from '@carelink/api-client';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const tasks = ref<CareTaskDto[]>([]);
const refreshing = ref(false);
let socket: ServerSocket | null = null;

const pendingCount = computed(() => tasks.value.length);

function typeLabel(type: string): string {
  switch (type) {
    case 'MOISTURE_CARE':
      return '疑似尿湿';
    case 'DEVICE_CHECK':
      return '设备检查';
    case 'MANUAL_CHECK':
      return '常规护理检查';
    default:
      return type;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'UNASSIGNED':
      return '待分配';
    case 'UNCLAIMED':
      return '待认领';
    case 'PROCESSING':
      return '处理中';
    default:
      return status;
  }
}

function statusTagType(status: string): 'primary' | 'warning' | 'success' {
  switch (status) {
    case 'UNASSIGNED':
      return 'primary';
    case 'UNCLAIMED':
      return 'warning';
    default:
      return 'success';
  }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  try {
    const res = await http.get<{ list: CareTaskDto[] }>('/v1/tasks', {
      params: { assignee: 'me', status: 'UNASSIGNED,UNCLAIMED,PROCESSING', page: 1, pageSize: 50 },
    });
    tasks.value = res.data.list;
  } finally {
    refreshing.value = false;
  }
}

async function onClaim(task: CareTaskDto) {
  try {
    await http.post(`/v1/tasks/${task.id}/claim`);
    showSuccessToast('接单成功');
    await load();
  } catch (err) {
    showToast((err as Error).message);
  }
}

function goProcess(task: CareTaskDto) {
  router.push(`/task-process/${task.id}`);
}

onMounted(() => {
  void load();
  socket = createSocket(() => auth.token);
  socket.on('task:assigned', () => {
    void load();
  });
  socket.on('task:transferred', () => {
    void load();
  });
  socket.on('task:timeout', () => {
    void load();
  });
  socket.connect();
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>

<style scoped>
.page {
  min-height: 100%;
}
.empty {
  padding: 64px 0;
}
</style>