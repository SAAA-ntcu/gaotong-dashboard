<script setup>
import { computed, ref } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { dimensionPriority, formatCount, formatPercent, formatPoints, getClassIds, getDimensions, getDimensionStat, itemPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true }
});

const dimensionType = ref('content');
const selectedKey = ref('');
const focusedQuestion = ref(null);
const dimensions = computed(() => getDimensions(props.subject, dimensionType.value));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedKey.value) || dimensions.value[0]);
const selectedPriority = computed(() => activeDimension.value ? dimensionPriority(props.subject, dimensionType.value, activeDimension.value.key, props.selectedClasses) : null);
const questionRows = computed(() => activeDimension.value ? activeDimension.value.items.map((question) => itemPriority(props.subject, question, props.selectedClasses)) : []);
const classRows = computed(() => activeDimension.value ? getClassIds(props.subject).map((classId) => ({ classId, stat: getDimensionStat(props.subject, dimensionType.value, activeDimension.value.key, [classId]) })).sort((a, b) => (a.stat?.rate ?? 1) - (b.stat?.rate ?? 1)) : []);
const chart = computed(() => ({
  animation: false,
  grid: { left: 42, right: 28, top: 18, bottom: 22, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  yAxis: { type: 'category', data: classRows.value.map((row) => `${row.classId} 班`) },
  series: [{ type: 'bar', data: classRows.value.map((row) => ({ value: Number(((row.stat?.rate || 0) * 100).toFixed(1)), classId: row.classId, itemStyle: { color: row.stat?.rate < 0.6 ? '#b86616' : '#2f6fb1' } })), barMaxWidth: 22 }]
}));

function setType(type) {
  dimensionType.value = type;
  selectedKey.value = '';
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>能力分析</h2><p>先看正式評量向度，再下鑽到向度內題目與班級表現。</p></div>
      <div class="subject360-segmented"><button type="button" :class="{ active: dimensionType === 'content' }" @click="setType('content')">內容向度</button><button type="button" :class="{ active: dimensionType === 'cognitive' }" :disabled="!getDimensions(subject, 'cognitive').length" @click="setType('cognitive')">認知向度</button></div>
    </div>
    <div v-if="!getDimensions(subject, 'cognitive').length" class="subject360-notice info">{{ subject.label }} 的正式資料只有內容向度，沒有提供認知向度對照；本頁不自行補分類。</div>

    <div class="subject360-dimension-grid">
      <button v-for="dimension in dimensions" :key="dimension.key" type="button" class="subject360-dimension-card" :class="{ active: activeDimension?.key === dimension.key }" @click="selectedKey = dimension.key">
        <div><strong>{{ dimension.key }}</strong><b>{{ formatPercent(dimensionPriority(subject, dimensionType, dimension.key, selectedClasses).selected?.rate) }}</b></div>
        <p>{{ dimension.description }}</p><small>{{ dimension.items.length }} 題・{{ formatPoints(dimensionPriority(subject, dimensionType, dimension.key, selectedClasses).gap) }} vs 全校</small>
      </button>
    </div>

    <div v-if="activeDimension && selectedPriority" class="subject360-grid subject360-grid-2 subject360-section-gap">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>{{ activeDimension.key }}｜題目組成</h3><span>{{ activeDimension.items.length }} 題</span></div>
        <div class="subject360-notice" :class="activeDimension.items.length < 2 ? 'warning' : 'info'">{{ activeDimension.items.length < 2 ? '此向度僅由一題構成，結果宜搭配原始試題與學生作答解讀。' : '向度答對率為向度內有效作答的合計答對率；點選題目可開啟單題診斷。' }}</div>
        <div class="subject360-table-wrap">
          <table class="subject360-table"><thead><tr><th>題目</th><th>全校</th><th>所選範圍</th><th>差距</th><th>主要錯誤</th><th>優先</th></tr></thead><tbody>
            <tr v-for="row in questionRows" :key="row.item.q" class="clickable-row" @click="focusedQuestion = row.item.q"><td>Q{{ row.item.q }} {{ row.item.short }}</td><td>{{ formatPercent(row.school.rate) }}<small>N={{ formatCount(row.school.valid) }}</small></td><td>{{ formatPercent(row.selected.rate) }}<small>N={{ formatCount(row.selected.valid) }}</small></td><td>{{ formatPoints(row.delta) }}</td><td>{{ row.selected.topWrong ? ['A', 'B', 'C', 'D'][row.selected.topWrong.option - 1] : '—' }}</td><td><span class="subject360-priority" :class="row.level === '高優先' ? 'high' : row.level === '中優先' ? 'medium' : 'observe'">{{ row.level }}</span></td></tr>
          </tbody></table>
        </div>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>{{ activeDimension.key }}｜班級表現</h3><span>所選範圍與全校向度比較</span></div>
        <Subject360Chart :option="chart" :height="330" :aria-label="`${activeDimension.key} 班級答對率`" />
        <div class="subject360-signal-list"><div><b>向度判斷</b><p><span class="subject360-priority" :class="selectedPriority.level === '高優先' ? 'high' : selectedPriority.level === '中優先' ? 'medium' : 'observe'">{{ selectedPriority.level }}</span> {{ selectedPriority.reasons.join('；') || '目前沒有明顯差距' }}</p></div><div><b>資料解讀</b><p>能力向度用來導航，不能單獨取代題目內容、選項分布與學生資料。</p></div></div>
      </article>
    </div>
    <SubjectItemDialog :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" />
  </div>
</template>
