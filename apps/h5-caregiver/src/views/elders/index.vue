<template>
  <div class="page">
    <van-nav-bar title="在护老人" />
    <van-pull-refresh v-model="refreshing" @refresh="load">
      <div v-if="elders.length === 0" class="empty">
        <van-empty description="暂无在护老人" />
      </div>
      <div v-for="e in elders" :key="e.elderId" class="elder-card" @click="goElder(e)">
        <div class="elder-info">
          <div class="elder-name">{{ e.elderName }}</div>
          <div class="elder-bed">{{ e.bedLabel ?? '未分床' }} · 护理等级 L{{ e.careLevel }}</div>
        </div>
        <van-tag
          :type="e.monitorStatus === 'NORMAL' ? 'success' : e.monitorStatus === 'PENDING_CHECK' ? 'warning' : 'default'"
          size="large"
        >
          {{ statusLabel(e.monitorStatus) }}
        </van-tag>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { showToast } from 'vant';
import { http } from '@/api';

interface ElderOverviewItem {
  elderId: string;
  elderName: string;
  bedLabel: string | null;
  careLevel: number;
  monitorStatus: 'NORMAL' | 'PENDING_CHECK' | 'OFFLINE_UNKNOWN';
  deviceNo: string | null;
  deviceOnlineStatus: string | null;
  pendingEventCount: number;
}

const elders = ref<ElderOverviewItem[]>([]);
const refreshing = ref(false);

// R005：设备离线时显示"离线/未知"，不显示正常或干燥
function statusLabel(status: ElderOverviewItem['monitorStatus']): string {
  switch (status) {
    case 'NORMAL':
      return '正常';
    case 'PENDING_CHECK':
      return '待核查';
    case 'OFFLINE_UNKNOWN':
      return '离线/未知';
    default:
      return status;
  }
}

async function load() {
  try {
    const res = await http.get<{ list: ElderOverviewItem[] }>('/v1/caregivers/me/elders-overview');
    elders.value = res.data.list;
  } catch (err) {
    showToast((err as Error).message);
  } finally {
    refreshing.value = false;
  }
}

function goElder(e: ElderOverviewItem) {
  if (e.monitorStatus === 'OFFLINE_UNKNOWN') {
    showToast(`${e.elderName}：监测设备离线或未绑定，请安排人工检查（R005）`);
  } else if (e.monitorStatus === 'PENDING_CHECK') {
    showToast(`${e.elderName}：有 ${e.pendingEventCount} 项待核查事件，请在待办中处理`);
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  min-height: 100%;
}
.empty {
  padding: 64px 0;
}
.elder-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
.elder-name {
  font-size: 16px;
  font-weight: 600;
}
.elder-bed {
  color: #969799;
  font-size: 12px;
  margin-top: 4px;
}
</style>