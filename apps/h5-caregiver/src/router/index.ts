import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/login/index.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/layouts/TabLayout.vue'),
    redirect: '/todo',
    children: [
      { path: 'todo', name: 'todo', component: () => import('@/views/todo/index.vue'), meta: { title: '今日待办' } },
      { path: 'elders', name: 'elders', component: () => import('@/views/elders/index.vue'), meta: { title: '在护老人' } },
      { path: 'task-process/:taskId', name: 'task-process', component: () => import('@/views/task-process/index.vue'), meta: { title: '任务处理' } },
      { path: 'handover', name: 'handover', component: () => import('@/views/handover/index.vue'), meta: { title: '交接班' } },
      { path: 'profile', name: 'profile', component: () => import('@/views/profile/index.vue'), meta: { title: '我的' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/todo' },
];

const router = createRouter({
  history: createWebHistory('/h5/'),
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
  return true;
});

export default router;