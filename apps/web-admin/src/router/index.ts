import { createRouter, createWebHistory } from 'vue-router';
import { UserRole } from '@carelink/shared-types';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/login/index.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '照护总览' } },
      { path: 'workbench', name: 'workbench', component: () => import('@/views/workbench/index.vue'), meta: { title: '护理工作台' } },
      { path: 'elder', name: 'elder', component: () => import('@/views/elder/index.vue'), meta: { title: '老人档案' } },
      { path: 'elder/:id', name: 'elder-detail', component: () => import('@/views/elder/detail.vue'), meta: { title: '老人详情' } },
      { path: 'ai', name: 'ai', component: () => import('@/views/ai/index.vue'), meta: { title: '智能照护' } },
      { path: 'device', name: 'device', component: () => import('@/views/device/index.vue'), meta: { title: '设备中心' } },
      { path: 'operation', name: 'operation', component: () => import('@/views/operation/index.vue'), meta: { title: '运营管理' } },
      { path: 'system', name: 'system', component: () => import('@/views/system/index.vue'), meta: { title: '系统设置', roles: [UserRole.ADM] } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    return true;
  }
  if (!auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  const roles = to.meta.roles as UserRole[] | undefined;
  if (roles && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;