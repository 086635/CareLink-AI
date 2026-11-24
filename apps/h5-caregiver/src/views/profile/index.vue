<template>
  <div class="page">
    <van-nav-bar title="我的" />
    <div v-if="auth.user" class="profile-card">
      <div class="avatar">{{ auth.user.name.slice(0, 1) }}</div>
      <div class="profile-info">
        <div class="profile-name">{{ auth.user.name }}</div>
        <div class="profile-meta">{{ auth.user.orgName }} · {{ roleLabel }}</div>
      </div>
    </div>

    <van-cell-group inset title="我的信息">
      <van-cell title="账号" :value="auth.user?.account" />
      <van-cell title="角色" :value="roleLabel" />
      <van-cell title="在岗状态" :value="auth.user?.onDuty ? '在岗' : '离岗'" />
    </van-cell-group>

    <van-cell-group inset title="护理历史（本人执行）">
      <div v-if="records.length === 0" class="empty">
        <van-empty description="暂无护理记录" image-size="60" />
      </div>
      <van-cell
        v-for="r in records"
        :key="r.id"
        :title="checkResultLabel(r.checkResult)"
        :label="formatTime(r.executedAt)"
        :value="r.simulated ? '模拟' : '真实'"
      />
      <div style="padding: 12px 16px">
        <van-button block plain size="small" @click="loadMore" :disabled="!hasMore">
          {{ hasMore ? '加载更多' : '没有更多了' }}
        </van-button>
      </div>
    </van-cell-group>

    <div style="margin: 24px 16px">
      <van-button round block type="danger" plain @click="onLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { CareRecordDto } from '@carelink/shared-types';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const records = ref<CareRecordDto[]>([]);
const page = ref(1);
const hasMore = ref(false);

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case 'ADM':
      return '机构管理者';
    case 'SUP':
      return '护理主管';
    case 'CG':
      return '护理员';
    default:
      return '—';
  }
});

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

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function load() {
  const res = await http.get<{ list: CareRecordDto[]; total: number }>('/v1/records', {
    params: { executorId: 'me', page: page.value, pageSize: 10 },
  });
  records.value = res.data.list;
  hasMore.value = page.value * 10 < res.data.total;
}

async function loadMore() {
  page.value += 1;
  await load();
}

async function onLogout() {
  await auth.logout();
  router.replace('/login');
}

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      router.push('/login');
      return;
    }
  }
  await load();
});
</script>

<style scoped>
.page {
  min-height: 100%;
  padding-bottom: 24px;
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 12px 16px;
  padding: 20px;
  background: linear-gradient(135deg, #0f2b46, #1d4e7a);
  border-radius: 12px;
  color: #fff;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}
.profile-name {
  font-size: 18px;
  font-weight: 600;
}
.profile-meta {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}
.empty {
  padding: 24px 0;
}
</style>