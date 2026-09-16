<script setup>
import { computed } from 'vue';

const props = defineProps({
  subject: { type: Object, required: true }
});

const advice = computed(() => props.subject.teachingAdvice || null);
</script>

<template>
  <article v-if="advice" class="subject360-card subject360-advice-card subject360-section-gap">
    <div class="subject360-card-head"><div><h3>歷史教學建議</h3><p class="subject360-advice-topic">{{ advice.topic }}｜{{ advice.grade }}｜借鑑 {{ advice.historicalYears.join('、') }} 年資料</p></div><span class="subject360-badge">查詢年度 {{ advice.queryYear }}</span></div>
    <div class="subject360-notice info">{{ advice.summary }}</div>
    <div class="subject360-advice-grid">
      <article v-for="(item, index) in advice.actions" :key="item.title" class="subject360-advice-item">
        <span class="subject360-advice-index">0{{ index + 1 }}</span>
        <div><h4>{{ item.title }}</h4><p><b>教學做法</b>{{ item.action }}</p><p><b>歷史證據</b>{{ item.evidence }}</p></div>
      </article>
    </div>
    <details class="subject360-advice-sources"><summary>查看歷史來源</summary><ul><li v-for="source in advice.sources" :key="source.chunkId">{{ source.year }}｜{{ source.filename }}｜{{ source.chunkId }}</li></ul></details>
  </article>
</template>
