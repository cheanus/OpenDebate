import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

// 懒加载页面组件
const DebateList = () => import('./pages/DebateList.vue');
const DebateOpinion = () => import('./pages/DebateOpinion.vue');
const Settings = () => import('./pages/Settings.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/debates',
  },
  {
    path: '/debates',
    name: 'debates',
    component: DebateList,
    meta: {
      title: '辩论列表',
      description: '查看和管理所有辩论话题',
    },
  },
  {
    path: '/debate/:id',
    name: 'debate-opinion',
    component: DebateOpinion,
    props: true,
    meta: {
      title: '辩论观点',
      description: '查看和编辑辩论观点',
    },
    beforeEnter: (to) => {
      // 验证辩论 ID 格式
      const id = to.params.id as string;
      if (!id || id.trim() === '') {
        return { name: 'debates' };
      }
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      title: '设置',
      description: '应用设置和配置',
    },
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/debates',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 全局前置守卫
router.beforeEach((to) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - OpenDebate`;
  } else {
    document.title = 'OpenDebate';
  }
});

export default router;
