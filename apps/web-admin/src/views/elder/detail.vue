<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <span>老人照护时间线（事件 / 任务 / 记录三类数据按时间轴聚合）</span>
          <el-button @click="router.push('/elder')">返回列表</el-button>
        </div>
      </template>

      <el-descriptions :column="3" border style="margin-bottom: 20px" v-if="elder">
        <el-descriptions-item label="姓名">{{ elder.name }}</el-descriptions-item>
        <el-descriptions-item label="床位">{{ elder.bedLabel ?? '未分床' }}</el-descriptions-item>
        <el-descriptions-item label="护理等级">L{{ elder.careLevel }}</el-descriptions-item>
      </el-descriptions>

      <el-timeline v-if="timeline.length > 0">
        <el-timeline-item
          v-for="item in timeline"
          :key="item.kind + item.id"
          :timestamp="formatTime(item.occurredAt)"
          :type="item.kind === 'EVENT' ? 'warning' : item.kind === 'RECORD' ? 'success' : 'primary'"
        >
          <el-tag size="small" style="margin-right: 8px">{{ kindLabel(item.kind) }}</el-tag>
          <b>{{ item.title }}</b>
          <span v-if="item.detail" style="margin-left: 8px; color: #909399">{{ item.detail }}</span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无照护记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '@/api';

interface TimelineItem {
  kind: 'EVENT' | 'RECORD';
  id: string;
  occurredAt: string;
  title: string;
  detail: string | null;
}

interface ElderDetail {
  id: string;
  name: string;
  bedLabel: string | null;
  careLevel: number;
}

const route = useRoute();
const router = useRouter();
const elder = ref<ElderDetail | null>(null);
const timeline = ref<TimelineItem[]>([]);

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'EVENT':
      return '照护事件';
    case 'RECORD':
      return '护理记录';
    default:
      return kind;
  }
}

function eventStatusLabel(status: string): string {
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

function checkResultLabel(result: string): string {
  switch (result) {
    case 'CONFIRMED_MOISTURE':
      return '已确认尿湿';
    case 'NO_CHANGE_NEEDED':
      return '暂不需要更换';
    case 'FALSE_ALARM':
      return '设备误报';
    case 'NEED_FURTHER':
      return '需要进一步处理';
    default:
      return result;
  }
}

onMounted(async () => {
  const elderId = route.params.id as string;
  const [elderRes, eventRes, recordRes] = await Promise.all([
    http.get<ElderDetail>(`/v1/elders/${elderId}`),
    http.get<{ list: { id: string; eventType: string; status: string; triggeredAt: string; simulated: boolean }[] }>('/v1/events', {
      params: { status: 'PENDING_CHECK,PROCESSING,COMPLETED,FALSE_ALARM_CLOSED', page: 1, pageSize: 100 },
    }),
    http.get<{ list: { id: string; executedAt: string; checkResult: string; note: string | null; simulated: boolean; elderId: string }[] }>('/v1/records', {
      params: { elderId, page: 1, pageSize: 100 },
    }),
  ]);
  elder.value = elderRes.data;

  const items: TimelineItem[] = [];
  for (const e of eventRes.data.list) {
    items.push({
      kind: 'EVENT',
      id: e.id,
      occurredAt: e.triggeredAt,
      title: `${e.eventType === 'MOISTURE' ? '疑似尿湿' : '设备故障'} · ${eventStatusLabel(e.status)}${e.simulated ? '（模拟）' : ''}`,
      detail: null,
    });
  }
  for (const r of recordRes.data.list) {
    items.push({
      kind: 'RECORD',
      id: r.id,
      occurredAt: r.executedAt,
      title: `${checkResultLabel(r.checkResult)}${r.simulated ? '（模拟）' : ''}`,
      detail: r.note,
    });
  }
  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  timeline.value = items;
});
</script>

<style scoped>
.page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>