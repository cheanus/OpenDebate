import { createRouter, createWebHistory } from 'vue-router'
import DebateList from './pages/DebateList.vue'
import DebateOpinion from './pages/DebateOpinion.vue'
import Settings from './pages/Settings.vue'

const routes = [
  { path: '/', name: 'Home', component: DebateList },
  { path: '/debate/:id', name: 'DebateOpinion', component: DebateOpinion, props: true },
  { path: '/settings', name: 'Settings', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
