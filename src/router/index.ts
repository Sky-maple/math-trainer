import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: '仪表盘' } },
  { path: '/train', name: 'train', component: () => import('../views/TrainingView.vue'), meta: { title: '基础训练' } },
  { path: '/timed', name: 'timed', component: () => import('../views/TimedView.vue'), meta: { title: '限时挑战' } },
  { path: '/mistakes', name: 'mistakes', component: () => import('../views/MistakesView.vue'), meta: { title: '错题本' } },
  { path: '/stats', name: 'stats', component: () => import('../views/StatsView.vue'), meta: { title: '成绩统计' } },
  { path: '/smart', name: 'smart', component: () => import('../views/SmartView.vue'), meta: { title: '智能训练' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
