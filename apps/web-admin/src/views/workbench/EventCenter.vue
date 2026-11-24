<template>
  <div>
    <el-form inline style="margin-bottom: 12px">
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 180px" @change="load">
          <el-option label="待核查" value="PENDING_CHECK" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已完成" value="COMPLETED" />
          <el-option label="误报关闭" value="FALSE_ALARM_CLOSED" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="query.eventType" clearable placeholder="全部" style="width: 140px" @change="load">
          <el-option label="疑似尿湿" value="MOISTURE" />
          <el-option label="设备故障" value="DEVICE_FAULT" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="rows" border stripe>
      <el-table-column prop="eventType" label="类型" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.eventType === 'MOISTURE'" type="warning" size="small">疑似尿湿</el-tag>
          <el-tag v-else type="danger" size="small">设备故障</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="elderName" label="老人" width="100">
        <template #default="{ row }">{{ row.elderName ?? '（设备级）' }}</template>
      </el-table-column>
      <el-table-column prop="deviceNo" label="设备" width="140" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">{{ statusLabel(row.status) }}</template>
      </el-table-column>
      <el-table-column prop="signalCount" label="信号次数" width="90" />
      <el-table-column prop="triggeredAt" label="触发时间" width="170">
        <template #default="{ row }">{{ formatTime(row.triggeredAt) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.simulated" type="info" size="small">模拟</el-tag>
          <el-tag v-else size="small">真实</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 'PENDING_CHECK' || row.status === 'PROCESSING'"
            link type="danger" size="small"
            @click="openFalseAlarm(row)"
          >确认误报</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailDialog.visible" title="事件详情（触发依据可追溯，R010）" width="640px">
      <el-descriptions :column="2" border v-if="detailDialog.data">
        <el-descriptions-item label="事件ID">{{ detailDialog.data.id }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detailDialog.data.eventType }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailDialog.data.status }}</el-descriptions-item>
        <el-descriptions-item label="关联老人">{{ detailDialog.data.elderName ?? '（设备级）' }}</el-descriptions-item>
        <el-descriptions-item label="触发时间">{{ formatTime(detailDialog.data.triggeredAt) }}</el-descriptions-item>
        <el-descriptions-item label="误报原因">{{ detailDialog.data.falseAlarmReason ?? '—' }}</el-descriptions-item>
      </el-descriptions>
      <h4>触发依据</h4>
      <pre class="evidence">{{ JSON.stringify(detailDialog.data?.triggerEvidence, null, 2) }}</pre>
      <h4>状态轨迹</h4>
      <el-timeline>
        <el-timeline-item
          v-for="log in detailDialog.data?.transitionLogs ?? []"
          :key="log.id"
          :timestamp="formatTime(log.createdAt)"
        >
          {{ (log.fromStatus ?? '初始') }} → {{ log.toStatus }}{{ log.reason ? `（${log.reason}）` : '' }}
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <el-dialog v-model="falseAlarmDialog.visible" title="确认误报（原因必填，R020）" width="480px">
      <el-alert type="warning" :closable="false" title="确认误报将关闭该事件并取消关联任务，理由将永久保留" style="margin-bottom: 12px" />
      <el-input v-model="falseAlarmDialog.reason" type="textarea" :rows="3" placeholder="请填写误报原因，如：设备佩戴异常" />
      <template #footer>
        <el-button @click="falseAlarmDialog.visible = false">取消</el-button>
        <el-button type="danger" :loading="falseAlarmDialog.loading" @click="onFalseAlarm">确认误报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '@/api';

interface EventRow {
  id: string;
  eventType: string;
  status: string;
  elderName: string | null;
  deviceNo: string;
  signalCount: number;
  triggeredAt: string;
  simulated: boolean;
  falseAlarmReason: string | null;
  triggerEvidence: Record<string, unknown> | null;
  transitionLogs: { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }[];
}

const query = reactive({ status: 'PENDING_CHECK', eventType: '' });
const rows = ref<EventRow[]>([]);
const detailDialog = reactive<{ visible: boolean; data: EventRow | null }>({ visible: false, data: null });
const falseAlarmDialog = reactive({ visible: false, loading: false, eventId: '', reason: '' });

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
  const res = await http.get<{ list: EventRow[] }>('/v1/events', {
    params: { status: query.status, eventType: query.eventType || undefined, page: 1, pageSize: 50 },
  });
  rows.value = res.data.list;
}

onMounted(load);

async function openDetail(row: EventRow) {
  const res = await http.get<EventRow>(`/v1/events/${row.id}`);
  detailDialog.data = res.data;
  detailDialog.visible = true;
}

function openFalseAlarm(row: EventRow) {
  falseAlarmDialog.eventId = row.id;
  falseAlarmDialog.reason = '';
  falseAlarmDialog.visible = true;
}

async function onFalseAlarm() {
  if (!falseAlarmDialog.reason.trim()) {
    ElMessage.warning('误报原因必填');
    return;
  }
  falseAlarmDialog.loading = true;
  try {
    await http.post(`/v1/events/${falseAlarmDialog.eventId}/false-alarm`, {
      reason: falseAlarmDialog.reason,
    });
    falseAlarmDialog.visible = false;
    await load();
    ElMessage.success('事件已误报关闭，原因已保留');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    falseAlarmDialog.loading = false;
  }
}

defineExpose({ load });
</script>

<style scoped>
.evidence {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}
</style>