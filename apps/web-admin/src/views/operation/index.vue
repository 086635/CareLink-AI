<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <span>护理质量与运营统计（确定性计算，不使用 LLM，FR-AI-012）</span>
          <el-select v-model="simulated" style="width: 160px" @change="load">
            <el-option label="全部数据" :value="''" />
            <el-option label="仅真实数据" value="false" />
            <el-option label="仅模拟数据" value="true" />
          </el-select>
        </div>
      </template>

      <el-row :gutter="12">
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>事件处理统计</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="待处理">{{ eventStats?.pending ?? 0 }}</el-descriptions-item>
              <el-descriptions-item label="已完成">{{ eventStats?.completed ?? 0 }}</el-descriptions-item>
              <el-descriptions-item label="误报关闭">{{ eventStats?.falseAlarm ?? 0 }}</el-descriptions-item>
              <el-descriptions-item label="超时任务">{{ eventStats?.timeout ?? 0 }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>护理响应时长（事件触发 → 护理响应）</template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="平均响应（分钟）">{{ responseTime?.avgMinutes ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="P50（分钟）">{{ responseTime?.p50Minutes ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="P90（分钟）">{{ responseTime?.p90Minutes ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="样本数">{{ responseTime?.samples ?? 0 }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>护理任务完成率</template>
            <div class="rate-block">
              <span class="rate-value">{{ completionRate?.completionRate ?? 0 }}%</span>
              <el-descriptions :column="1" border style="width: 100%">
                <el-descriptions-item label="已完成">{{ completionRate?.completed ?? 0 }}</el-descriptions-item>
                <el-descriptions-item label="进行中">{{ completionRate?.open ?? 0 }}</el-descriptions-item>
                <el-descriptions-item label="已取消">{{ completionRate?.cancelled ?? 0 }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { http } from '@/api';

interface EventStats { pending: number; completed: number; falseAlarm: number; timeout: number; total: number }
interface ResponseTimeStats { avgMinutes: number | null; p50Minutes: number | null; p90Minutes: number | null; samples: number }
interface CompletionRateStats { completed: number; cancelled: number; open: number; completionRate: number }

const simulated = ref('');
const eventStats = ref<EventStats | null>(null);
const responseTime = ref<ResponseTimeStats | null>(null);
const completionRate = ref<CompletionRateStats | null>(null);

async function load() {
  const params = { simulated: simulated.value || undefined };
  const [eventRes, responseRes, completionRes] = await Promise.all([
    http.get<EventStats>('/v1/analytics/events', { params }),
    http.get<ResponseTimeStats>('/v1/analytics/response-time', { params }),
    http.get<CompletionRateStats>('/v1/analytics/completion-rate', { params }),
  ]);
  eventStats.value = eventRes.data;
  responseTime.value = responseRes.data;
  completionRate.value = completionRes.data;
}

onMounted(load);
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
.rate-block {
  text-align: center;
}
.rate-value {
  font-size: 40px;
  font-weight: 700;
  color: #409eff;
}
</style>