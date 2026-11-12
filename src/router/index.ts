import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: '仪表盘' } },
  { path: '/train', name: 'train', component: () => import('../views/TrainingView.vue'), meta: { title: '基础训练' } },
  { path: '/timed', name: 'timed', component: () => import('../views/TimedView.vue'), meta: { title: '限时挑战' } },
  { path: '/mistakes', name: 'mistakes', component: () => import('../views/MistakesView.vue'), meta: { title: '错题本' } },
  { path: '/stats', name: 'stats', component: () => import('../views/StatsView.vue'), meta: { title: '成绩统计' } },
  { path: '/smart', name: 'smart', component: () => import('../views/SmartView.vue'), meta: { title: '智能训练' } },

  // 心算技巧中心（独立模块）
  { path: '/techniques', name: 'techniques', component: () => import('../views/techniques/TechniqueCatalogView.vue'), meta: { title: '心算技巧中心' } },
  { path: '/techniques/challenge', name: 'technique-challenge', component: () => import('../views/techniques/TechniqueChallengeView.vue'), meta: { title: '技巧闯关' } },
  { path: '/techniques/mastery', name: 'technique-mastery', component: () => import('../views/techniques/TechniqueMasteryView.vue'), meta: { title: '技巧掌握度' } },
  { path: '/techniques/mistakes', name: 'technique-mistakes', component: () => import('../views/techniques/TechniqueMistakesView.vue'), meta: { title: '技巧错题本' } },
  { path: '/techniques/:id/practice', name: 'technique-practice', component: () => import('../views/techniques/TechniquePracticeView.vue'), meta: { title: '技巧专项练习' } },
  { path: '/techniques/:id', name: 'technique-teach', component: () => import('../views/techniques/TechniqueTeachView.vue'), meta: { title: '技巧教学' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
