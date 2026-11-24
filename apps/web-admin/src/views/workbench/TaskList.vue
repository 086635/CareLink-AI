<template>
  <div>
    <el-form inline style="margin-bottom: 12px">
      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 200px" @change="load">
          <el-option label="全部待办" value="UNASSIGNED,UNCLAIMED,PROCESSING" />
          <el-option label="待分配" value="UNASSIGNED" />
          <el-option label="待认领" value="UNCLAIMED" />
          <el-option label="处理中" value="PROCESSING" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="query.onlyMine" @change="load">只看我的</el-checkbox>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="rows" border stripe>
      <el-table-column prop="elderName" label="老人" width="100">
        <template #default="{ row }">{{ row.elderName ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="taskType" label="类型" width="120">
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
      <el-table-column prop="ownerName" label="负责人" width="100">
        <template #default="{ row }">{{ row.ownerName ?? '未分配' }}</template>
      </el-table-column>
      <el-table-column prop="deadline" label="处理时限" width="170">
        <template #default="{ row }">{{ formatTime(row.deadline) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.simulated" type="info" size="small">模拟</el-tag>
          <el-tag v-else size="small">真实</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="240" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'UNASSIGNED' || row.status === 'UNCLAIMED'"
            link type="primary" size="small"
            @click="onClaim(row)"
          >认领</el-button>
          <el-button
            v-if="row.status === 'PROCESSING' || row.status === 'UNCLAIMED'"
            link type="success" size="small"
            @click="openQuickChange(row)"
          >完成护理</el-button>
          <el-button
            v-if="row.status === 'UNASSIGNED'"
            link type="primary" size="small"
            @click="openAssign(row)"
          >分配</el-button>
          <el-button
            v-if="row.status !== 'COMPLETED' && row.status !== 'CANCELLED'"
            link type="warning" size="small"
            @click="openTransfer(row)"
          >转派</el-button>
          <el-button
            v-if="row.status !== 'COMPLETED' && row.status !== 'CANCELLED'"
            link type="danger" size="small"
            @click="onCancel(row)"
          >取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="quickDialog.visible" title="快捷更换登记（3 步完成，NFR-006）" width="520px">
      <el-alert
        type="info"
        :closable="false"
        title="第 2 步：选择实际检查结果；第 3 步：选择护理操作并确认完成"
        style="margin-bottom: 16px"
      />
      <el-form label-width="110px">
        <el-form-item label="检查结果">
          <el-radio-group v-model="quickDialog.form.checkResult">
            <el-radio value="CONFIRMED_MOISTURE">已确认尿湿</el-radio>
            <el-radio value="NO_CHANGE_NEEDED">暂不需要更换</el-radio>
            <el-radio value="FALSE_ALARM">设备误报</el-radio>
            <el-radio value="NEED_FURTHER">需要进一步处理</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="quickDialog.form.checkResult === 'CONFIRMED_MOISTURE'" label="护理操作">
          <el-radio-group v-model="quickDialog.form.careResult">
            <el-radio value="CHANGED">已更换纸尿裤</el-radio>
            <el-radio value="NEED_FURTHER">需要进一步处理</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="quickDialog.form.checkResult === 'FALSE_ALARM'" label="误报原因">
          <el-input v-model="quickDialog.form.note" placeholder="误报原因必填（R020）" />
        </el-form-item>
        <el-form-item v-else label="补充备注">
          <el-input v-model="quickDialog.form.note" placeholder="选填" />
        </el-form-item>
        <el-form-item label="皮肤状态">
          <el-checkbox v-model="quickDialog.form.skinAbnormal">存在异常，需关注</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="quickDialog.loading" @click="onQuickChange">确认完成护理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignDialog.visible" title="分配任务" width="440px">
      <el-select v-model="assignDialog.ownerId" filterable placeholder="选择在岗人员" style="width: 100%">
        <el-option
          v-for="c in onDutyCaregivers"
          :key="c.id"
          :label="`${c.name}（${roleLabel(c.role)}）`"
          :value="c.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="assignDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="assignDialog.loading" @click="onAssign">分配</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="transferDialog.visible" title="转派任务（R018：记录原/新负责人与原因）" width="480px">
      <el-form label-width="90px">
        <el-form-item label="新负责人">
          <el-select v-model="transferDialog.newOwnerId" filterable style="width: 100%">
            <el-option
              v-for="c in onDutyCaregivers"
              :key="c.id"
              :label="`${c.name}（${roleLabel(c.role)}）`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转派原因">
          <el-input v-model="transferDialog.reason" type="textarea" :rows="2" placeholder="原因必填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="transferDialog.loading" @click="onTransfer">转派</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserRole } from '@carelink/shared-types';
import type { CaregiverDto, CareTaskDto } from '@carelink/shared-types';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const canAssign = computed(() => auth.user?.role === UserRole.SUP || auth.user?.role === UserRole.ADM);

const query = reactive({ status: 'UNASSIGNED,UNCLAIMED,PROCESSING', onlyMine: false });
const rows = ref<CareTaskDto[]>([]);
const caregivers = ref<CaregiverDto[]>([]);
const onDutyCaregivers = computed(() => caregivers.value.filter((c) => c.onDuty && c.status === 'ACTIVE'));

const quickDialog = reactive({
  visible: false,
  loading: false,
  taskId: '',
  form: {
    checkResult: 'CONFIRMED_MOISTURE',
    careResult: 'CHANGED',
    note: '',
    skinAbnormal: false,
  },
});

const assignDialog = reactive({ visible: false, loading: false, taskId: '', ownerId: '' });
const transferDialog = reactive({ visible: false, loading: false, taskId: '', newOwnerId: '', reason: '' });

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

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

async function load() {
  const res = await http.get<{ list: CareTaskDto[] }>('/v1/tasks', {
    params: {
      status: query.status,
      assignee: query.onlyMine ? 'me' : undefined,
      page: 1,
      pageSize: 50,
    },
  });
  rows.value = res.data.list;
}

onMounted(async () => {
  await load();
  const res = await http.get<CaregiverDto[]>('/v1/caregivers');
  caregivers.value = res.data;
});

async function onClaim(row: CareTaskDto) {
  try {
    await http.post(`/v1/tasks/${row.id}/claim`);
    ElMessage.success('认领成功');
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

function openQuickChange(row: CareTaskDto) {
  quickDialog.taskId = row.id;
  quickDialog.form = { checkResult: 'CONFIRMED_MOISTURE', careResult: 'CHANGED', note: '', skinAbnormal: false };
  quickDialog.visible = true;
}

async function onQuickChange() {
  if (quickDialog.form.checkResult === 'FALSE_ALARM' && !quickDialog.form.note.trim()) {
    ElMessage.warning('误报原因必填');
    return;
  }
  quickDialog.loading = true;
  try {
    const res = await http.post<{ taskStatus: string; eventStatus: string | null }>('/v1/records/quick-change', {
      taskId: quickDialog.taskId,
      checkResult: quickDialog.form.checkResult,
      careResult: quickDialog.form.checkResult === 'CONFIRMED_MOISTURE' ? quickDialog.form.careResult : undefined,
      note: quickDialog.form.note || undefined,
      skinAbnormal: quickDialog.form.skinAbnormal || undefined,
    });
    quickDialog.visible = false;
    await load();
    ElMessage.success(`登记完成：任务${statusLabel(res.data.taskStatus)}${res.data.eventStatus ? `，事件${res.data.eventStatus}` : ''}`);
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    quickDialog.loading = false;
  }
}

function openAssign(row: CareTaskDto) {
  assignDialog.taskId = row.id;
  assignDialog.ownerId = '';
  assignDialog.visible = true;
}

async function onAssign() {
  if (!assignDialog.ownerId) {
    ElMessage.warning('请选择负责人');
    return;
  }
  assignDialog.loading = true;
  try {
    await http.post(`/v1/tasks/${assignDialog.taskId}/assign`, { ownerId: assignDialog.ownerId });
    assignDialog.visible = false;
    await load();
    ElMessage.success('分配成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    assignDialog.loading = false;
  }
}

function openTransfer(row: CareTaskDto) {
  transferDialog.taskId = row.id;
  transferDialog.newOwnerId = '';
  transferDialog.reason = '';
  transferDialog.visible = true;
}

async function onTransfer() {
  if (!transferDialog.newOwnerId || !transferDialog.reason.trim()) {
    ElMessage.warning('请选择新负责人并填写原因');
    return;
  }
  transferDialog.loading = true;
  try {
    await http.post(`/v1/tasks/${transferDialog.taskId}/transfer`, {
      newOwnerId: transferDialog.newOwnerId,
      reason: transferDialog.reason,
    });
    transferDialog.visible = false;
    await load();
    ElMessage.success('转派成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    transferDialog.loading = false;
  }
}

async function onCancel(row: CareTaskDto) {
  if (!canAssign.value) {
    ElMessage.warning('仅主管可取消任务');
    return;
  }
  let reason: string;
  try {
    const result = await ElMessageBox.prompt('取消理由必填（R020）', '取消任务', {
      inputPlaceholder: '请填写取消理由',
      inputValidator: (v: string) => (v && v.trim() ? true : '取消理由必填'),
    });
    reason = result.value;
  } catch {
    return;
  }
  try {
    await http.post(`/v1/tasks/${row.id}/cancel`, { reason });
    await load();
    ElMessage.success('任务已取消');
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

defineExpose({ load });
</script>