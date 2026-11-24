<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <span class="brand-name">CareLink-AI 智护无忧</span>
        <span class="brand-sub">机构管理中心</span>
      </div>
      <el-menu
        :default-active="route.path"
        router
        class="menu"
        background-color="#0f2b46"
        text-color="#c9d8e4"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">照护总览</el-menu-item>
        <el-menu-item index="/workbench">护理工作台</el-menu-item>
        <el-menu-item index="/elder">老人档案</el-menu-item>
        <el-menu-item index="/ai">智能照护</el-menu-item>
        <el-menu-item index="/device">设备中心</el-menu-item>
        <el-menu-item index="/operation">运营管理</el-menu-item>
        <el-menu-item v-if="auth.isAdmin" index="/system">系统设置</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-title">{{ route.meta.title }}</div>
        <div class="header-right">
          <span class="user-name">{{ auth.user?.name }}（{{ roleLabel }}）</span>
          <el-button link type="danger" @click="onLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UserRole } from '@carelink/shared-types';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const roleLabel = computed(() => {
  switch (auth.user?.role) {
    case UserRole.ADM:
      return '机构管理者';
    case UserRole.SUP:
      return '护理主管';
    case UserRole.CG:
      return '护理员';
    default:
      return '';
  }
});

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      router.push('/login');
    }
  }
});

async function onLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background-color: #0f2b46;
}
.brand {
  padding: 20px 16px;
  border-bottom: 1px solid #1d3d5c;
}
.brand-name {
  display: block;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.brand-sub {
  display: block;
  color: #7fa3c0;
  font-size: 12px;
  margin-top: 4px;
}
.menu {
  border-right: none;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}
.header-title {
  font-size: 16px;
  font-weight: 600;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-name {
  color: #606266;
  font-size: 14px;
}
.main {
  background: #f5f7fa;
  overflow-y: auto;
}
</style>