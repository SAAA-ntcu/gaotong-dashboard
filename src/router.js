import { createRouter, createWebHistory } from 'vue-router';
import SchoolView from './views/SchoolView.vue';
import ClassView from './views/ClassView.vue';
import SubjectView from './views/SubjectView.vue';
import {
  canAccessClass,
  canAccessSubject,
  getAccessProfile,
  getDefaultLocation
} from './data/access';

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function rootRedirect(to) {
  const profile = getAccessProfile(queryValue(to.query.role));
  if (profile.canViewSchool && to.query.class) {
    return { name: 'class', query: { role: profile.id, class: queryValue(to.query.class) } };
  }
  return getDefaultLocation(profile);
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: rootRedirect },
    { path: '/index.html', redirect: rootRedirect },
    { path: '/school', name: 'school', component: SchoolView },
    { path: '/class', name: 'class', component: ClassView },
    { path: '/subject', name: 'subject', component: SubjectView }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0, behavior: 'smooth' };
  }
});

router.beforeEach((to) => {
  const profile = getAccessProfile(queryValue(to.query.role));

  if (to.name === 'school') {
    if (!profile.canViewSchool) return getDefaultLocation(profile);
    if (queryValue(to.query.role) !== profile.id) {
      return { name: 'school', query: { ...to.query, role: profile.id } };
    }
  }

  if (to.name === 'class') {
    if (!profile.canViewClass) return getDefaultLocation(profile);
    const requestedClass = queryValue(to.query.class);
    const classId = canAccessClass(profile, requestedClass) ? String(requestedClass) : profile.classIds[0];
    if (requestedClass !== classId || queryValue(to.query.role) !== profile.id) {
      return { name: 'class', query: { ...to.query, role: profile.id, class: classId } };
    }
  }

  if (to.name === 'subject') {
    const requestedSubject = queryValue(to.query.subject);
    const subjectId = canAccessSubject(profile, requestedSubject) ? String(requestedSubject) : profile.subjectIds[0];
    const requestedClasses = String(queryValue(to.query.class) || '').split(',').filter(Boolean);
    const selectedClasses = requestedClasses.filter((classId) => canAccessClass(profile, classId));
    const classIds = selectedClasses.length ? selectedClasses : profile.classIds;
    const nextQuery = { ...to.query, role: profile.id, subject: subjectId };
    if (classIds.length === profile.classIds.length) delete nextQuery.class;
    else nextQuery.class = classIds.join(',');
    const sameQuery = JSON.stringify(nextQuery) === JSON.stringify(to.query);
    if (!sameQuery) return { name: 'subject', query: nextQuery };
  }

  return true;
});

export default router;
