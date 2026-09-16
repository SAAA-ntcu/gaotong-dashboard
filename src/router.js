import { createRouter, createWebHistory } from 'vue-router';
import SchoolView from './views/SchoolView.vue';
import ClassView from './views/ClassView.vue';

function rootRedirect(to) {
  return to.query.class
    ? { name: 'class', query: { class: to.query.class } }
    : { name: 'school' };
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: rootRedirect },
    { path: '/index.html', redirect: rootRedirect },
    { path: '/school', name: 'school', component: SchoolView },
    { path: '/class', name: 'class', component: ClassView }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0, behavior: 'smooth' };
  }
});

export default router;
