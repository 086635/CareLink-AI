<template>
  <div class="tab-layout">
    <div class="content">
      <router-view />
    </div>
    <van-tabbar route>
      <van-tabbar-item to="/todo" icon="todo-list-o">待办</van-tabbar-item>
      <van-tabbar-item to="/elders" icon="friends-o">老人</van-tabbar-item>
      <van-tabbar-item to="/handover" icon="exchange">交接</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      router.push('/login');
    }
  }
});
</script>

<style scoped>
.tab-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 12px;
}
</style>