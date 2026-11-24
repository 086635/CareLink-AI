<template>
  <div class="page">
    <van-nav-bar title="交接班" />
    <van-cell-group inset title="本班摘要">
      <van-cell title="未完成任务" :value="`${myTasks.length} 项`" />
      <van-cell title="超时任务" :value="`${timeoutCount} 项`" />
      <van-button
        block
        type="primary"
        plain
        style="margin: 12px 16px; width: calc(100% - 32px)"
        :loading="aiLoading"
        @click="generateAiSummary"
      >生成 AI 交接班摘要</van-button>
    </van-cell-group>

    <van-cell-group v-if="aiReport" inset title="AI 交接班摘要">
      <template #default>
        <div class="ai-report">
          <div class="ai-badge">
            <van-tag type="warning">AI 生成</van-tag>
            <van-tag v-if="aiReport.degradedFlag" type="default">模板降级</van-tag>
            <van-tag v-if="aiReport.insufficientFlag" type="danger">数据不足</van-tag>
          </div>
          <p class="ai-summary">{{ aiReport.content.summary }}</p>
          <ul v-if="aiReport.content.items.length">
            <li v-for="item in aiReport.content.items" :key="item">{{ item }}</li>
          </ul>
          <p class="ai-range">数据范围：{{ aiReport.dataRange.description }}（R026 可追溯）</p>
        </div>
      </template>
    </van-cell-group>

    <van-cell-group inset title="待移交事项（R019：只移交负责人，任务状态不变）">
      <van-checkbox-group v-model="selectedTaskIds">
        <van-checkbox
          v-for="task in myTasks"
          :key="task.id"
          :name="task.id"
          shape="square"
          label-position="right"
          style="padding: 8px 16px"
        >
          {{ task.elderName ?? '未关联老人' }} · {{ typeLabel(task.taskType) }}
          <van-tag v-if="task.timeoutFlag" type="danger" style="margin-left: 4px">超时</van-tag>
        </van-checkbox>
      </van-checkbox-group>
    </van-cell-group>

    <van-cell-group inset title="接班人">
      <van-field
        v-model="toCaregiverName"
        is-link
        readonly
        placeholder="选择在岗人员"
        @click="showPicker = true"
      />
      <van-popup v-model:show="showPicker" position="bottom" round>
        <van-picker
          :columns="onDutyCaregivers.map((c) => ({ text: `${c.name}（${roleLabel(c.role)}）`, value: c.id }))"
          @confirm="onPickCaregiver"
          @cancel="showPicker = false"
        />
      </van-popup>
    </van-cell-group>

    <div style="margin: 24px 16px">
      <van-button round block type="primary" :loading="submitting" @click="onSubmit">
        发起交接（{{ selectedTaskIds.length }} 项）
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showSuccessToast, showToast } from 'vant';
import type { AiReportDto, CaregiverDto, CareTaskDto } from '@carelink/shared-types';
import { http } from '@/api';

const myTasks = ref<CareTaskDto[]>([]);
const caregivers = ref<CaregiverDto[]>([]);
const selectedTaskIds = ref<string[]>([]);
const toCaregiverId = ref('');
const toCaregiverName = ref('');
const showPicker = ref(false);
const submitting = ref(false);
const aiLoading = ref(false);
const aiReport = ref<AiReportDto | null>(null);

const timeoutCount = computed(() => myTasks.value.filter((t) => t.timeoutFlag).length);
const onDutyCaregivers = computed(() =>
  caregivers.value.filter((c) => c.onDuty && c.status === 'ACTIVE'),
);

function typeLabel(type: string): string {
  switch (type) {
    case 'MOISTURE_CARE':
      return '尿湿护理';
    case 'DEVICE_CHECK':
      return '设备检查';
    default:
      return '常规检查';
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'ADM':
      return '管理者';
    case 'SUP':
      return '主管';
    default:
      return '护理员';
  }
}

async function load() {
  const [taskRes, cgRes] = await Promise.all([
    http.get<{ list: CareTaskDto[] }>('/v1/tasks', {
      params: { status: 'UNASSIGNED,UNCLAIMED,PROCESSING', page: 1, pageSize: 100 },
    }),
    http.get<CaregiverDto[]>('/v1/caregivers'),
  ]);
  myTasks.value = taskRes.data.list;
  caregivers.value = cgRes.data;
}

onMounted(load);

function onPickCaregiver({ value, text }: { value: string; text: string }) {
  toCaregiverId.value = value;
  toCaregiverName.value = text;
  showPicker.value = false;
}

async function generateAiSummary() {
  aiLoading.value = true;
  try {
    const shiftFrom = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const res = await http.post<AiReportDto>('/v1/ai/handover-summaries', {
      shiftFrom,
      shiftTo: new Date().toISOString(),
    });
    aiReport.value = res.data;
  } catch (err) {
    showToast((err as Error).message);
  } finally {
    aiLoading.value = false;
  }
}

async function onSubmit() {
  if (!toCaregiverId.value) {
    showToast('请选择接班人');
    return;
  }
  if (selectedTaskIds.value.length === 0) {
    showToast('请勾选需要移交的任务');
    return;
  }
  submitting.value = true;
  try {
    await http.post('/v1/handovers', {
      toCaregiverId: toCaregiverId.value,
      shiftFrom: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      shiftTo: new Date().toISOString(),
      taskIds: selectedTaskIds.value,
    });
    showSuccessToast(`交接成功，已移交 ${selectedTaskIds.value.length} 项任务`);
    await load();
    selectedTaskIds.value = [];
    aiReport.value = null;
  } catch (err) {
    showToast((err as Error).message);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 24px;
}
.ai-report {
  padding: 12px 16px;
}
.ai-badge {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.ai-summary {
  font-size: 14px;
  color: #323233;
  margin: 0 0 8px;
}
.ai-range {
  font-size: 12px;
  color: #969799;
  margin: 8px 0 0;
}
</style>