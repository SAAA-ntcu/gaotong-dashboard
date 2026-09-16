<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, itemPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  focusQuestion: { type: Number, default: null }
});
const emit = defineEmits(['select-class', 'select-student']);

const itemSort = ref('priority');
const contentFilter = ref('all');
const cognitiveFilter = ref('all');
const priorityFilter = ref('all');
const focusedQuestion = ref(props.focusQuestion);

watch(() => props.focusQuestion, (value) => { if (value) focusedQuestion.value = value; });

const contentKeys = computed(() => ['all', ...props.subject.dimensions?.content?.map((dimension) => dimension.key) || []]);
const cognitiveKeys = computed(() => ['all', ...props.subject.dimensions?.cognitive?.map((dimension) => dimension.key) || []]);
const rows = computed(() => props.subject.items.map((item) => itemPriority(props.subject, item.q, props.selectedClasses)).filter((row) => {
  const contentMatch = contentFilter.value === 'all' || row.item.content === contentFilter.value;
  const cognitiveMatch = cognitiveFilter.value === 'all' || row.item.cognitive === cognitiveFilter.value;
  const priorityMatch = priorityFilter.value === 'all' || row.level === priorityFilter.value;
  return contentMatch && cognitiveMatch && priorityMatch;
}).sort((a, b) => {
  if (itemSort.value === 'q') return a.item.q - b.item.q;
  if (itemSort.value === 'rate') return (a.selected.rate ?? 1) - (b.selected.rate ?? 1);
  if (itemSort.value === 'classGap') return (a.delta ?? 0) - (b.delta ?? 0);
  return b.signals - a.signals || (a.selected.rate ?? 1) - (b.selected.rate ?? 1);
}));
const chartRows = computed(() => rows.value.slice(0, 8));
const chart = computed(() => ({
  animation: false,
  grid: { left: 70, right: 22, top: 18, bottom: 24, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  yAxis: { type: 'category', data: chartRows.value.map((row) => `Q${row.item.q}`) },
  series: [1, 2, 3, 4, 5].map((option) => ({ name: ['A', 'B', 'C', '其他／未答'][option - 1] || '其他／未答', type: 'bar', stack: 'answer', data: chartRows.value.map((row) => ({ value: Number(((row.selected.optionRates?.[option - 1] || 0) * 100).toFixed(1)), question: row.item.q, itemStyle: { color: option === row.item.answer ? '#17243d' : ['#9bb5cf', '#e29a61', '#7ab6a8', '#8d83bd', '#d8dde5'][option - 1] } })) }))
}));

function chartClick(params) {
  if (params.data?.question) focusedQuestion.value = params.data.question;
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head"><div><h2>試題證據</h2><p>先看選項分布與班級差異，再回到需要確認的題目與學生。</p></div><label class="subject360-inline-control">排序<select v-model="itemSort"><option value="priority">教學優先度</option><option value="q">題號</option><option value="rate">答對率低到高</option><option value="classGap">班級落差低到高</option></select></label></div>
    <div class="subject360-filter-bar"><label>內容向度<select v-model="contentFilter"><option v-for="key in contentKeys" :key="key" :value="key">{{ key === 'all' ? '全部' : key }}</option></select></label><label>認知向度<select v-model="cognitiveFilter" :disabled="cognitiveKeys.length === 1"><option v-for="key in cognitiveKeys" :key="key" :value="key">{{ key === 'all' && cognitiveKeys.length === 1 ? '此科未提供' : key === 'all' ? '全部' : key }}</option></select></label><label>優先度<select v-model="priorityFilter"><option value="all">全部</option><option value="高優先">高優先</option><option value="中優先">中優先</option><option value="建議觀察">建議觀察</option></select></label></div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card"><div class="subject360-card-head"><h3>選項分布</h3><span>前 {{ chartRows.length }} 題｜深色＝正確答案</span></div><Subject360Chart v-if="chartRows.length" :option="chart" :height="Math.max(300, chartRows.length * 40 + 90)" aria-label="試題選項分布" @chart-click="chartClick" /><p v-else class="subject360-empty">沒有符合目前篩選的題目。</p><p class="subject360-caption">答對率使用有效作答；選項圖將未答／無效值保留在其他類別。</p></article>
      <article class="subject360-card"><div class="subject360-card-head"><h3>解讀提示</h3><span>Item → Option</span></div><div class="subject360-signal-list"><div><b>分母</b><p>答對率使用有效選項作答數 N；選項圖使用全部學生列。</p></div><div><b>主要錯誤</b><p>主要錯誤選項表示錯答集中，不等同迷思概念已被確診。</p></div><div><b>下鑽</b><p>點選題目可查看選項分布、班級比較與需要回到題目確認的學生。</p></div></div></article>
    </div>

    <article class="subject360-card subject360-section-gap"><div class="subject360-card-head"><h3>題目總覽（{{ formatCount(rows.length) }} / {{ formatCount(subject.questionCount) }}）</h3><span>點選列開啟單題診斷</span></div><div class="subject360-table-wrap"><table class="subject360-table"><thead><tr><th>題目</th><th>內容向度</th><th>所選範圍</th><th>全校</th><th>差距</th><th>主要錯誤</th><th>優先</th></tr></thead><tbody><tr v-for="row in rows" :key="row.item.q" class="clickable-row" @click="focusedQuestion = row.item.q"><td>Q{{ row.item.q }} {{ row.item.short }}</td><td>{{ row.item.content }}</td><td>{{ formatPercent(row.selected.rate) }}<small>N={{ formatCount(row.selected.valid) }}</small></td><td>{{ formatPercent(row.school.rate) }}</td><td>{{ formatPoints(row.delta) }}</td><td>{{ row.selected.topWrong ? ['A', 'B', 'C', 'D'][row.selected.topWrong.option - 1] : '—' }}</td><td><span class="subject360-priority" :class="row.level === '高優先' ? 'high' : row.level === '中優先' ? 'medium' : 'observe'">{{ row.level }}</span></td></tr></tbody></table></div></article>
    <SubjectItemDialog :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" @select-class="emit('select-class', $event)" @select-student="emit('select-student', $event)" />
  </div>
</template>
