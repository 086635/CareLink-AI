<template>
  <div class="page">
    <van-nav-bar title="任务处理" left-arrow @click-left="router.back()" />
    <div v-if="task" class="content">
      <van-cell-group inset title="任务信息">
        <van-cell title="老人" :value="task.elderName ?? '—'" />
        <van-cell title="状态" :value="statusLabel(task.status)" />
        <van-cell title="等待时间" :value="waitLabel" />
      </van-cell-group>

      <van-cell-group inset title="实际检查结果（第 2 步）">
        <van-radio-group v-model="form.checkResult" direction="horizontal">
          <van-radio name="CONFIRMED_MOISTURE">已确认尿湿</van-radio>
          <van-radio name="NO_CHANGE_NEEDED">暂不需要更换</van-radio>
          <van-radio name="FALSE_ALARM">设备误报</van-radio>
        </van-radio-group>
      </van-cell-group>

      <van-cell-group v-if="form.checkResult === 'CONFIRMED_MOISTURE'" inset title="护理操作">
        <van-radio-group v-model="form.careResult" direction="horizontal">
          <van-radio name="CHANGED">已更换纸尿裤</van-radio>
          <van-radio name="NEED_FURTHER">需要进一步处理</van-radio>
        </van-radio-group>
      </van-cell-group>

      <van-cell-group v-if="form.checkResult === 'FALSE_ALARM'" inset title="误报原因（必填）">
        <van-field
          v-model="form.note"
          type="textarea"
          rows="2"
          placeholder="请填写误报原因，如：设备佩戴异常（R020）"
        />
      </van-cell-group>

      <van-cell-group inset title="补充（选填）">
        <van-field v-model="form.note2" type="textarea" rows="2" placeholder="补充备注" />
        <van-cell title="皮肤状态异常" center>
          <template #right-icon>
            <van-switch v-model="form.skinAbnormal" size="22" />
          </template>
        </van-cell>
      </van-cell-group>

      <div style="margin: 24px 16px">
        <van-button round block type="primary" :loading="submitting" @click="onSubmit">
          确认完成护理（第 3 步）
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showSuccessToast, showToast } from 'vant';
import type { CareTaskDto } from '@carelink/shared-types';
import { http } from '@/api';

const route = useRoute();
const router = useRouter();
const taskId = route.params.taskId as string;
const task = ref<CareTaskDto | null>(null);
const submitting = ref(false);
const form = ref({
  checkResult: 'CONFIRMED_MOISTURE',
  careResult: 'CHANGED',
  note: '',
  note2: '',
  skinAbnormal: false,
});

const waitLabel = computed(() => {
  if (!task.value) return '—';
  const diff = Date.now() - new Date(task.value.createdAt).getTime();
  return `${Math.floor(diff / 60000)} 分钟`;
});

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

onMounted(async () => {
  const res = await http.get<CareTaskDto>(`/v1/tasks/${taskId}`);
  task.value = res.data;
});

async function onSubmit() {
  if (form.value.checkResult === 'FALSE_ALARM' && !form.value.note.trim()) {
    showToast('误报原因必填');
    return;
  }
  if (form.value.checkResult === 'CONFIRMED_MOISTURE' && !form.value.careResult) {
    showToast('请选择护理操作');
    return;
  }
  submitting.value = true;
  try {
    const res = await http.post<{ taskStatus: string; eventStatus: string | null }>(
      '/v1/records/quick-change',
      {
        taskId,
        checkResult: form.value.checkResult,
        careResult: form.value.checkResult === 'CONFIRMED_MOISTURE' ? form.value.careResult : undefined,
        note: form.value.checkResult === 'FALSE_ALARM' ? form.value.note : form.value.note2 || undefined,
        skinAbnormal: form.value.skinAbnormal || undefined,
      },
    );
    showSuccessToast(
      `登记完成：任务${statusLabel(res.data.taskStatus)}${res.data.eventStatus ? '，事件已联动' : ''}`,
    );
    router.replace('/todo');
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
}
.content {
  padding-top: 8px;
}
</style>