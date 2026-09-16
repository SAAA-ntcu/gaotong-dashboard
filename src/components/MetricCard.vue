<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  detail: { type: String, default: '' },
  tone: { type: String, default: 'blue' },
  icon: { type: String, default: '·' }
});
</script>

<template>
  <article class="metric-card" :class="`tone-${tone}`">
    <div class="metric-card-top">
      <span class="metric-icon" aria-hidden="true">{{ icon }}</span>
      <span class="metric-label">{{ label }}</span>
    </div>
    <strong class="metric-value">{{ value }}</strong>
    <span v-if="detail" class="metric-detail">{{ detail }}</span>
  </article>
</template>
