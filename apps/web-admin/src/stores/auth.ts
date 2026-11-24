import { defineStore } from 'pinia';
import type { LoginResponse, MeResponse } from '@carelink/shared-types';
import { UserRole } from '@carelink/shared-types';
import { http } from '@/api';

const TOKEN_KEY = 'carelink_admin_token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) as string | null,
    user: null as MeResponse | null,
  }),
  getters: {
    isLoggedIn: (state) => state.token != null,
    role: (state) => state.user?.role ?? null,
    isAdmin: (state) => state.user?.role === UserRole.ADM,
  },
  actions: {
    async login(account: string, password: string) {
      const res = await http.post<LoginResponse>('/v1/auth/login', { account, password });
      this.token = res.data.accessToken;
      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      await this.fetchMe();
    },
    async fetchMe() {
      const res = await http.get<MeResponse>('/v1/auth/me');
      this.user = res.data;
    },
    async logout() {
      try {
        await http.post('/v1/auth/logout');
      } finally {
        this.token = null;
        this.user = null;
        localStorage.removeItem(TOKEN_KEY);
      }
    },
    clear() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
    },
  },
});