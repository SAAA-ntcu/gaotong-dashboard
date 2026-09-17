<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, getClassIds, getLinkedDimensions, itemPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  visibleClassIds: { type: Array, default: () => [] },
  focusQuestion: { type: Number, default: null }
});
const emit = defineEmits(['select-class', 'select-student']);
const classScope = computed(() => props.visibleClassIds.length ? props.visibleClassIds : getClassIds(props.subject));
const comparisonLabel = computed(() => classScope.value.length === getClassIds(props.subject).length ? '全校' : '可見範圍');

const itemSort = ref('priority');
const linkedFilter = ref('all');
const priorityFilter = ref('all');
const focusedQuestion = ref(props.focusQuestion);

watch(() => props.focusQuestion, (value) => { focusedQuestion.value = value || null; });

const linkedDimensions = computed(() => getLinkedDimensions(props.subject));
const linkedKeys = computed(() => ['all', ...linkedDimensions.value.map((dimension) => dimension.key)]);
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const rows = computed(() => props.subject.items.map((item) => itemPriority(props.subject, item.q, props.selectedClasses, classScope.value)).filter((row) => {
  const rowLinkedKey = [row.item.content, row.item.cognitive].filter(Boolean).join(' × ');
  const linkedMatch = linkedFilter.value === 'all' || rowLinkedKey === linkedFilter.value;
  const priorityMatch = priorityFilter.value === 'all' || row.level === priorityFilter.value;
  return linkedMatch && priorityMatch;
}).sort((a, b) => {
  if (itemSort.value === 'q') return a.item.q - b.item.q;
  if (itemSort.value === 'rate') return (a.selected.rate ?? 1) - (b.selected.rate ?? 1);
  if (itemSort.value === 'classGap') return (a.delta ?? 0) - (b.delta ?? 0);
  return b.signals - a.signals || (a.selected.rate ?? 1) - (b.selected.rate ?? 1);
}));
const chartRows = computed(() => rows.value.slice(0, 8));
const chart = computed(() => ({
  animation: false,
  grid: { left: 55, right: 22, top: 28, bottom: 56, containLabel: true },
  tooltip: {
    position: 'top',
    formatter: (params) => {
      const row = chartRows.value[params.value[1]];
      const option = ['A', 'B', 'C', 'D', '其他／未答'][params.value[0]];
      return `Q${row?.item.q || ''} ${row?.item.short || ''}<br/>${option}：${Number(params.value[2]).toFixed(1)}%<br/>正確答案：${['A', 'B', 'C', 'D'][row?.item.answer - 1] || '—'}`;
    }
  },
  xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', '其他／未答'], axisLabel: { interval: 0 } },
  yAxis: { type: 'category', data: chartRows.value.map((row) => `Q${row.item.q}`) },
  visualMap: { min: 0, max: 100, show: false, inRange: { color: ['#f7f9fc', '#c5dced', '#2f6fb1'] } },
  series: [{
    type: 'heatmap',
    data: chartRows.value.flatMap((row, y) => [0, 1, 2, 3, 4].map((option, x) => ({
      value: [x, y, Number(((row.selected.optionRates?.[option] || 0) * 100).toFixed(1))],
      question: row.item.q
    }))),
    label: { show: true, formatter: (params) => `${Number(params.value[2]).toFixed(0)}%`, color: '#17243d', fontSize: 10 }
  }]
}));

function chartClick(params) {
  if (params.data?.question) focusedQuestion.value = params.data.question;
}
function closeQuestion() {
  focusedQuestion.value = null;
}
function selectClass(classId) {
  closeQuestion();
  emit('select-class', classId);
}
function selectStudent(studentId) {
  closeQuestion();
  emit('select-student', studentId);
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head"><div><h2>試題資料</h2><p>先看選項分布與班級差異，再搭配 115 弱點判讀確認教學問題。</p></div><label class="subject360-inline-control">排序<select v-model="itemSort"><option value="priority">教學優先度</option><option value="q">題號</option><option value="rate">答對率低到高</option><option value="classGap">班級落差低到高</option></select></label></div>
    <div class="subject360-filter-bar"><label>{{ hasCognitive ? '內容 × 認知' : '內容向度' }}<select v-model="linkedFilter"><option v-for="key in linkedKeys" :key="key" :value="key">{{ key === 'all' ? '全部' : key }}</option></select></label><label>優先度<select v-model="priorityFilter"><option value="all">全部</option><option value="高優先">高優先</option><option value="中優先">中優先</option><option value="建議觀察">建議觀察</option></select></label></div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card"><div class="subject360-card-head"><h3>題目 × 選項熱圖</h3><span>前 {{ chartRows.length }} 題｜顏色越深代表比例越高</span></div><Subject360Chart v-if="chartRows.length" :option="chart" :height="Math.max(300, chartRows.length * 40 + 90)" aria-label="題目選項熱圖" @chart-click="chartClick" /><p v-else class="subject360-empty">沒有符合目前篩選的題目。</p><p class="subject360-caption">每格是該題在所選範圍的選項比例；滑過可查看正確答案，點擊題目列可開啟完整試題資料。</p></article>
      <article class="subject360-card"><div class="subject360-card-head"><h3>解讀提示</h3><span>Item → Option</span></div><div class="subject360-signal-list"><div><b>分母</b><p>答對率使用有效選項作答數 N；選項圖使用全部學生列。</p></div><div><b>主要錯誤</b><p>主要錯誤選項表示錯答集中，不等同迷思概念已被確診。</p></div><div><b>下鑽</b><p>點選題目可查看選項分布、班級比較與需要回到題目確認的學生。</p></div></div></article>
    </div>

    <article class="subject360-card subject360-section-gap"><div class="subject360-card-head"><h3>題目總覽（{{ formatCount(rows.length) }} / {{ formatCount(subject.questionCount) }}）</h3><span>點選列開啟單題診斷</span></div><div class="subject360-table-wrap"><table class="subject360-table"><thead><tr><th>題目</th><th>{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</th><th>所選範圍</th><th>{{ comparisonLabel }}</th><th>差距</th><th>主要錯誤</th><th>優先</th></tr></thead><tbody><tr v-for="row in rows" :key="row.item.q" class="clickable-row" @click="focusedQuestion = row.item.q"><td>Q{{ row.item.q }} {{ row.item.short }}</td><td>{{ [row.item.content, row.item.cognitive].filter(Boolean).join(' × ') }}</td><td>{{ formatPercent(row.selected.rate) }}<small>N={{ formatCount(row.selected.valid) }}</small></td><td>{{ formatPercent(row.school.rate) }}</td><td>{{ formatPoints(row.delta) }}</td><td>{{ row.selected.topWrong ? ['A', 'B', 'C', 'D'][row.selected.topWrong.option - 1] : '—' }}</td><td><span class="subject360-priority" :class="row.level === '高優先' ? 'high' : row.level === '中優先' ? 'medium' : 'observe'">{{ row.level }}</span></td></tr></tbody></table></div></article>
    <SubjectItemDialog :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible-class-ids="visibleClassIds" :visible="Boolean(focusedQuestion)" @close="closeQuestion" @select-class="selectClass" @select-student="selectStudent" />
  </div>
</template>
