<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">CareLink-AI 智护无忧</h1>
      <p class="subtitle">AIoT 老年智能照护管理平台 · 机构管理中心</p>
      <el-form :model="form" @submit.prevent="onLogin">
        <el-form-item>
          <el-input v-model="form.account" placeholder="账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" native-type="submit">
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const form = reactive({ account: '', password: '' });
const loading = ref(false);
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

async function onLogin() {
  if (!form.account || !form.password) {
    ElMessage.warning('请输入账号和密码');
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.account, form.password);
    const redirect = (route.query.redirect as string) ?? '/dashboard';
    router.push(redirect);
  } catch (err) {
    ElMessage.error((err as Error).message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2b46 0%, #1d4e7a 100%);
}
.login-card {
  width: 380px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.title {
  margin: 0;
  text-align: center;
  font-size: 22px;
  color: #0f2b46;
}
.subtitle {
  text-align: center;
  color: #909399;
  font-size: 13px;
  margin: 8px 0 28px;
}
.login-btn {
  width: 100%;
}
</style>