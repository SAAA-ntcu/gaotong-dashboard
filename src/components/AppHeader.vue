<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ACCESS_PROFILES,
  getAccessProfile,
  getDefaultLocation
} from '../data/access';

const route = useRoute();
const router = useRouter();
const roleOptions = ACCESS_PROFILES;
const activeProfile = computed(() => getAccessProfile(route.query.role));
const currentClass = computed(() => {
  const requested = String(route.query.class || '');
  return activeProfile.value.classIds.includes(requested) ? requested : activeProfile.value.classIds[0];
});
const currentSubjectId = computed(() => {
  const requested = String(route.query.subject || '');
  return activeProfile.value.subjectIds.includes(requested) ? requested : activeProfile.value.subjectIds[0];
});
const homeLocation = computed(() => getDefaultLocation(activeProfile.value));
const classLocation = computed(() => ({
  name: 'class',
  query: { role: activeProfile.value.id, class: currentClass.value }
}));
const subjectLocation = computed(() => ({
  name: 'subject',
  query: { role: activeProfile.value.id, subject: currentSubjectId.value, class: activeProfile.value.classIds.join(',') }
}));

function switchRole(roleId) {
  router.replace(getDefaultLocation(getAccessProfile(roleId)));
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="brand-block">
        <div class="eyebrow-row">
          <span class="eyebrow-chip light">115 年度</span>
          <span class="eyebrow-chip accent">學力檢測決策儀表板</span>
          <span class="eyebrow-chip muted">Vue 版</span>
        </div>
        <RouterLink class="brand-title" :to="homeLocation">高通國小學力檢測決策儀表板</RouterLink>
        <p class="brand-subtitle">從年級問題定位到班級跨科工作臺，讓數據直接連到下一個教學行動</p>
      </div>

      <div class="header-controls">
        <div class="header-access">
          <label class="header-role-picker">
            <span>目前視角</span>
            <select :value="activeProfile.id" @change="switchRole($event.target.value)">
              <option v-for="profile in roleOptions" :key="profile.id" :value="profile.id">{{ profile.label }}</option>
            </select>
          </label>
          <div class="header-scope">
            <strong>{{ activeProfile.label }}</strong>
            <small>{{ activeProfile.scopeLabel }}</small>
          </div>
        </div>
        <nav class="header-nav" aria-label="儀表板導覽">
          <RouterLink v-if="activeProfile.canViewSchool" class="nav-link" :class="{ active: route.name === 'school' }" :to="{ name: 'school', query: { role: activeProfile.id } }">
            <span aria-hidden="true">⌂</span> 校務總覽
          </RouterLink>
          <RouterLink v-if="activeProfile.canViewClass" class="nav-link" :class="{ active: route.name === 'class' }" :to="classLocation">
            <span aria-hidden="true">▦</span> Class
          </RouterLink>
          <RouterLink class="nav-link" :class="{ active: route.name === 'subject' }" :to="subjectLocation">
            <span aria-hidden="true">◎</span> Subject
          </RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>
