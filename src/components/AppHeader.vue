<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { classIds } from '../data/dashboard';

const route = useRoute();
const currentClass = computed(() => route.query.class && classIds.includes(String(route.query.class))
  ? String(route.query.class)
  : classIds[0]);
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
        <RouterLink class="brand-title" to="/school">高通國小學力檢測決策儀表板</RouterLink>
        <p class="brand-subtitle">從年級問題定位到班級跨科工作臺，讓數據直接連到下一個教學行動</p>
      </div>

      <nav class="header-nav" aria-label="儀表板導覽">
        <RouterLink class="nav-link" :class="{ active: route.name === 'school' }" to="/school">
          <span aria-hidden="true">⌂</span> 校務總覽
        </RouterLink>
        <RouterLink
          class="nav-link"
          :class="{ active: route.name === 'class' }"
          :to="{ name: 'class', query: { class: currentClass } }"
        >
          <span aria-hidden="true">▦</span> Class
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
