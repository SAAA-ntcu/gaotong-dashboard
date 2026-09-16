<script setup>
import { ref } from 'vue';

const props = defineProps({
  classIds: { type: Array, required: true },
  selectedClasses: { type: Array, required: true },
  scopeLabel: { type: String, required: true }
});

const emit = defineEmits(['toggle-class', 'select-all']);
const open = ref(false);
</script>

<template>
  <div class="subject360-scope-picker">
    <button class="subject360-scope-trigger" type="button" :aria-expanded="open" @click="open = !open">
      <span><small>分析範圍</small><strong>{{ scopeLabel }}</strong></span><b>{{ open ? '收合' : '選擇' }}⌄</b>
    </button>
    <div v-if="open" class="subject360-scope-panel">
      <div class="subject360-scope-panel-head"><strong>選擇分析班級</strong><button type="button" @click="emit('select-all')">全校 {{ classIds.length }} 班</button></div>
      <label v-for="classId in classIds" :key="classId" class="subject360-scope-option"><input type="checkbox" :checked="selectedClasses.includes(classId)" @change="emit('toggle-class', classId)" /><span>{{ classId }} 班</span></label>
      <small class="subject360-scope-hint">目前選取 {{ selectedClasses.length }} / {{ classIds.length }} 班</small>
    </div>
  </div>
</template>
