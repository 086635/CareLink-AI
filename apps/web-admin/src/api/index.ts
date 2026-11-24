import { createApiClient, ApiError } from '@carelink/api-client';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

export const http = createApiClient({
  baseURL: '/api',
  getToken: () => useAuthStore().token,
  onUnauthorized: () => {
    useAuthStore().clear();
    router.push('/login');
  },
});

export { ApiError };