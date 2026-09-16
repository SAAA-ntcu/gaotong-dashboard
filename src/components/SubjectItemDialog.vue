<script setup>
import { computed } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { formatCount, formatPercent, getClassOverall, getItemStat, getStudentById, getClassIds, getSubjectMeta } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  question: { type: Number, default: null },
  selectedClasses: { type: Array, required: true },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const item = computed(() => props.question ? props.subject.items[props.question - 1] : null);
const selectedStat = computed(() => item.value ? getItemStat(props.subject, props.question, props.selectedClasses) : null);
const schoolStat = computed(() => item.value ? getItemStat(props.subject, props.question, getClassIds(props.subject)) : null);
const classRows = computed(() => item.value ? getClassIds(props.subject).map((classId) => ({
  classId,
  stat: getItemStat(props.subject, props.question, [classId]),
  overall: getClassOverall(props.subject, classId)
})).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)) : []);
const affectedStudents = computed(() => {
  if (!item.value) return [];
  const scope = new Set(props.selectedClasses);
  return (props.subject.students || [])
    .filter((student) => scope.has(student.class))
    .filter((student) => {
      const response = student.responses[props.question - 1];
      return response == null || response !== item.value.answer;
    })
    .slice(0, 12);
});
const optionLabels = ['A', 'B', 'C', 'D', '其他／未答'];
const optionChart = computed(() => ({
  animation: false,
  grid: { left: 42, right: 18, top: 20, bottom: 28, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  yAxis: { type: 'category', data: optionLabels },
  series: [{ type: 'bar', data: (selectedStat.value?.optionRates || []).map((rate, index) => ({ value: Number((rate * 100).toFixed(1)), itemStyle: { color: index + 1 === item.value?.answer ? '#17243d' : '#9bb5cf' } })), barMaxWidth: 22 }]
}));
const meta = computed(() => getSubjectMeta(props.subject.key));
</script>

<template>
  <div v-if="visible && item" class="subject360-modal" role="dialog" aria-modal="true" :aria-label="`Q${item.q} 題目診斷`">
    <button class="subject360-modal-backdrop" type="button" aria-label="關閉題目診斷" @click="emit('close')" />
    <section class="subject360-modal-panel">
      <header class="subject360-modal-head">
        <div>
          <span class="subject360-kicker" :style="{ color: meta.color }">ITEM DIAGNOSTIC</span>
          <h2>Q{{ item.q }}・{{ item.short }}</h2>
          <p>{{ item.content }}<span v-if="item.cognitive">・{{ item.cognitive }}</span></p>
        </div>
        <button class="icon-button" type="button" aria-label="關閉題目診斷" @click="emit('close')">×</button>
      </header>
      <div class="subject360-modal-body">
        <div class="subject360-mini-grid">
          <div><span>正確答案</span><strong>{{ ['A', 'B', 'C', 'D'][item.answer - 1] || item.answer }}</strong></div>
          <div><span>目前範圍</span><strong>{{ formatPercent(selectedStat?.rate) }}</strong><small>N={{ formatCount(selectedStat?.valid) }}</small></div>
          <div><span>全校</span><strong>{{ formatPercent(schoolStat?.rate) }}</strong><small>N={{ formatCount(schoolStat?.valid) }}</small></div>
          <div><span>主要錯誤</span><strong>{{ selectedStat?.topWrong ? ['A', 'B', 'C', 'D'][selectedStat.topWrong.option - 1] : '—' }}</strong><small>{{ selectedStat?.topWrong ? formatPercent(selectedStat.topWrong.share) + ' of wrong' : '無明顯集中' }}</small></div>
        </div>
        <div class="subject360-modal-grid">
          <article class="subject360-card">
            <div class="subject360-card-head"><h3>選項分布</h3><span>正確答案以深色標示</span></div>
            <Subject360Chart :option="optionChart" :height="250" aria-label="題目選項分布" />
          </article>
          <article class="subject360-card">
            <div class="subject360-card-head"><h3>班級答對率</h3><span>低到高排序</span></div>
            <div class="subject360-class-list">
              <div v-for="row in classRows" :key="row.classId" class="subject360-class-row">
                <span>{{ row.classId }} 班</span><div><i :style="{ width: `${Math.max(1, (row.stat.rate || 0) * 100)}%` }" :class="{ low: row.stat.rate < 0.6 }" /></div><strong>{{ formatPercent(row.stat.rate) }}</strong>
              </div>
            </div>
          </article>
        </div>
        <article class="subject360-card">
          <div class="subject360-card-head"><h3>需要回到題目確認的學生</h3><span>最多顯示 12 人</span></div>
          <div v-if="affectedStudents.length" class="subject360-tag-list">
            <span v-for="student in affectedStudents" :key="student.id" class="subject360-tag emphasis">{{ student.class }}班 {{ student.seat }}號</span>
          </div>
          <p v-else class="subject360-empty">目前範圍沒有錯答或未答學生。</p>
        </article>
      </div>
    </section>
  </div>
</template>
