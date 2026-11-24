<template>
  <div>
    <el-alert
      type="info"
      :closable="false"
      title="交接班只移交未完成任务的负责人，任务状态保持不变、不会被自动关闭（R019）"
      style="margin-bottom: 12px"
    />
    <el-form inline>
      <el-form-item label="接班人">
        <el-select v-model="form.toCaregiverId" filterable placeholder="选择在岗人员" style="width: 220px">
          <el-option
            v-for="c in onDutyCaregivers"
            :key="c.id"
            :label="`${c.name}（${roleLabel(c.role)}）`"
            :value="c.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="班次开始">
        <el-date-picker v-model="form.shiftFrom" type="datetime" placeholder="班次开始时间" />
      </el-form-item>
      <el-form-item label="班次结束">
        <el-date-picker v-model="form.shiftTo" type="datetime" placeholder="班次结束时间" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="onSubmit">发起交接（{{ selectedTasks.length }} 项）</el-button>
      </el-form-item>
    </el-form>

    <h4>待移交清单（勾选需要移交的未完成任务）</h4>
    <el-table
      :data="myTasks"
      border
      size="small"
      @selection-change="(v: CareTaskDto[]) => (selectedTasks = v)"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="elderName" label="老人" width="100">
        <template #default="{ row }">{{ row.elderName ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="taskType" label="类型" width="110">
        <template #default="{ row }">{{ typeLabel(row.taskType) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">{{ statusLabel(row.status) }}</template>
      </el-table-column>
      <el-table-column label="超时" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.timeoutFlag" type="danger" size="small">超时</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column prop="deadline" label="处理时限" min-width="160">
        <template #default="{ row }">{{ formatTime(row.deadline) }}</template>
      </el-table-column>
    </el-table>

    <h4 style="margin-top: 20px">历史交接班</h4>
    <el-table :data="history" border size="small">
      <el-table-column prop="handedOverAt" label="交接时间" width="170">
        <template #default="{ row }">{{ formatTime(row.handedOverAt) }}</template>
      </el-table-column>
      <el-table-column prop="fromCaregiverId" label="交班人ID" width="120" />
      <el-table-column prop="toCaregiverId" label="接班人ID" width="120" />
      <el-table-column prop="itemCount" label="移交项数" width="100" />
      <el-table-column label="操作" min-width="100">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailDialog.visible" title="交接班详情（移交轨迹可查，AC09）" width="640px">
      <el-table :data="detailDialog.items" border size="small">
        <el-table-column prop="taskId" label="任务ID" width="120" />
        <el-table-column prop="ownerBefore" label="移交前负责人" width="130">
          <template #default="{ row }">{{ row.ownerBefore ?? '未分配' }}</template>
        </el-table-column>
        <el-table-column prop="ownerAfter" label="移交后负责人" width="130">
          <template #default="{ row }">{{ row.ownerAfter ?? '未分配' }}</template>
        </el-table-column>
        <el-table-column label="任务状态" width="100">
          <template #default="{ row }">{{ row.task ? statusLabel(row.task.status) : '—' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { CaregiverDto, CareTaskDto } from '@carelink/shared-types';
import { http } from '@/api';

const form = reactive({
  toCaregiverId: '',
  shiftFrom: new Date(Date.now() - 8 * 60 * 60 * 1000),
  shiftTo: new Date(),
});
const submitting = ref(false);
const caregivers = ref<CaregiverDto[]>([]);
const myTasks = ref<CareTaskDto[]>([]);
const selectedTasks = ref<CareTaskDto[]>([]);
const history = ref<{ id: string; handedOverAt: string; fromCaregiverId: string; toCaregiverId: string; itemCount: number }[]>([]);
const detailDialog = reactive<{ visible: boolean; items: { taskId: string; ownerBefore: string | null; ownerAfter: string | null; task: { status: string } | null }[] }>({
  visible: false,
  items: [],
});

const onDutyCaregivers = computed(() =>
  caregivers.value.filter((c) => c.onDuty && c.status === 'ACTIVE'),
);

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

function typeLabel(type: string): string {
  switch (type) {
    case 'MOISTURE_CARE':
      return '尿湿护理';
    case 'DEVICE_CHECK':
      return '设备检查';
    case 'MANUAL_CHECK':
      return '人工检查';
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
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
    default:
      return status;
  }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

async function load() {
  const [cgRes, taskRes, historyRes] = await Promise.all([
    http.get<CaregiverDto[]>('/v1/caregivers'),
    http.get<{ list: CareTaskDto[] }>('/v1/tasks', {
      params: { status: 'UNASSIGNED,UNCLAIMED,PROCESSING', page: 1, pageSize: 100 },
    }),
    http.get<{ list: typeof history.value }>('/v1/handovers', {
      params: { page: 1, pageSize: 10 },
    }),
  ]);
  caregivers.value = cgRes.data;
  myTasks.value = taskRes.data.list;
  history.value = historyRes.data.list;
}

onMounted(load);

async function onSubmit() {
  if (!form.toCaregiverId) {
    ElMessage.warning('请选择接班人');
    return;
  }
  if (selectedTasks.value.length === 0) {
    ElMessage.warning('请勾选需要移交的任务');
    return;
  }
  submitting.value = true;
  try {
    await http.post('/v1/handovers', {
      toCaregiverId: form.toCaregiverId,
      shiftFrom: (form.shiftFrom as Date).toISOString(),
      shiftTo: (form.shiftTo as Date).toISOString(),
      taskIds: selectedTasks.value.map((t) => t.id),
    });
    ElMessage.success(`交接成功，已移交 ${selectedTasks.value.length} 项任务`);
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    submitting.value = false;
  }
}

async function openDetail(row: { id: string }) {
  const res = await http.get<{ items: typeof detailDialog.items }>(`/v1/handovers/${row.id}`);
  detailDialog.items = res.data.items;
  detailDialog.visible = true;
}
</script>