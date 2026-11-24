<template>
  <div class="login-page">
    <div class="login-header">
      <h1>CareLink-AI 智护无忧</h1>
      <p>护理员移动端</p>
    </div>
    <van-form @submit="onLogin">
      <van-cell-group inset>
        <van-field
          v-model="account"
          name="account"
          label="账号"
          placeholder="请输入账号"
          :rules="[{ required: true, message: '请输入账号' }]"
        />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
      </van-cell-group>
      <div style="margin: 24px 16px">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          登 录
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useAuthStore } from '@/stores/auth';

const account = ref('');
const password = ref('');
const loading = ref(false);
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

async function onLogin() {
  loading.value = true;
  try {
    await auth.login(account.value, password.value);
    const redirect = (route.query.redirect as string) ?? '/todo';
    router.push(redirect);
  } catch (err) {
    showToast((err as Error).message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #0f2b46 0%, #1d4e7a 60%, #f7f8fa 60.1%);
}
.login-header {
  padding: 64px 24px 48px;
  color: #fff;
}
.login-header h1 {
  margin: 0;
  font-size: 24px;
}
.login-header p {
  margin: 8px 0 0;
  opacity: 0.8;
  font-size: 14px;
}
</style>