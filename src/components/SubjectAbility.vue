<script setup>
import { computed, ref } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, getLinkedDimensions, itemPriority, linkedDimensionPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  initialDimension: { type: String, default: '' }
});

const selectedKey = ref(props.initialDimension);
const focusedQuestion = ref(null);
const dimensions = computed(() => getLinkedDimensions(props.subject));
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedKey.value) || dimensions.value[0]);
const selectedPriority = computed(() => activeDimension.value ? linkedDimensionPriority(props.subject, activeDimension.value, props.selectedClasses) : null);
const questionRows = computed(() => activeDimension.value ? activeDimension.value.items.map((question) => itemPriority(props.subject, question, props.selectedClasses)) : []);
const radarChart = computed(() => ({
  animation: false,
  tooltip: { trigger: 'item', valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  legend: { top: 0, data: ['所選範圍', '全校'] },
  radar: { center: ['50%', '56%'], radius: '68%', indicator: questionRows.value.map((row) => ({ name: `Q${row.item.q}`, max: 100 })), axisName: { color: '#5e6f86', fontSize: 11 }, splitArea: { areaStyle: { color: ['#fbfcfe', '#f1f5f9'] } }, splitLine: { lineStyle: { color: '#dbe3ed' } }, axisLine: { lineStyle: { color: '#dbe3ed' } } },
  series: [{ type: 'radar', data: [
    { name: '所選範圍', value: questionRows.value.map((row) => Number(((row.selected.rate || 0) * 100).toFixed(1))), lineStyle: { color: '#2f6fb1', width: 2 }, itemStyle: { color: '#2f6fb1' }, areaStyle: { color: 'rgba(47, 111, 177, 0.16)' } },
    { name: '全校', value: questionRows.value.map((row) => Number(((row.school.rate || 0) * 100).toFixed(1))), lineStyle: { color: '#b86616', width: 2, type: 'dashed' }, itemStyle: { color: '#b86616' }, areaStyle: { color: 'rgba(184, 102, 22, 0.06)' } }
  ] }]
}));

function chooseDimension(dimension) {
  selectedKey.value = dimension.key;
}
function chartClick(params) {
  const question = activeDimension.value?.items?.[params.dataIndex];
  if (question) focusedQuestion.value = question;
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>能力診斷</h2><p>{{ hasCognitive ? '每張卡都是內容向度 × 認知向度的聯結，避免把數學能力拆成兩張互不相干的表。' : '依內容向度下鑽到題目與學生證據。' }}</p></div>
      <span class="subject360-badge">{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</span>
    </div>

    <div class="subject360-dimension-grid">
      <button v-for="dimension in dimensions" :key="dimension.key" type="button" class="subject360-dimension-card" :class="{ active: activeDimension?.key === dimension.key }" @click="chooseDimension(dimension)">
        <div><strong>{{ dimension.label || dimension.key }}</strong><b>{{ formatPercent(linkedDimensionPriority(subject, dimension, selectedClasses).selected?.rate) }}</b></div>
        <p>{{ dimension.description }}</p><small>{{ dimension.items.length }} 題・{{ formatPoints(linkedDimensionPriority(subject, dimension, selectedClasses).gap) }} vs 全校</small>
      </button>
    </div>

    <div v-if="activeDimension && selectedPriority" class="subject360-grid subject360-grid-2 subject360-section-gap">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>{{ activeDimension.label || activeDimension.key }}｜題目組成</h3><span>{{ activeDimension.items.length }} 題</span></div>
        <Subject360Chart :option="radarChart" :height="330" :aria-label="`${activeDimension.label || activeDimension.key} 題目雷達圖`" @chart-click="chartClick" />
        <p class="subject360-caption">藍色是所選範圍，橘色虛線是全校；點擊雷達軸或下方題目可開啟單題證據。</p>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>題目證據</h3><span>{{ activeDimension.description }}</span></div>
        <div class="subject360-table-wrap">
          <table class="subject360-table"><thead><tr><th>題目</th><th>全校</th><th>所選範圍</th><th>差距</th><th>主要錯誤</th><th>優先</th></tr></thead><tbody>
            <tr v-for="row in questionRows" :key="row.item.q" class="clickable-row" @click="focusedQuestion = row.item.q"><td>Q{{ row.item.q }} {{ row.item.short }}</td><td>{{ formatPercent(row.school.rate) }}<small>N={{ formatCount(row.school.valid) }}</small></td><td>{{ formatPercent(row.selected.rate) }}<small>N={{ formatCount(row.selected.valid) }}</small></td><td>{{ formatPoints(row.delta) }}</td><td>{{ row.selected.topWrong ? ['A', 'B', 'C', 'D'][row.selected.topWrong.option - 1] : '—' }}</td><td><span class="subject360-priority" :class="row.level === '高優先' ? 'high' : row.level === '中優先' ? 'medium' : 'observe'">{{ row.level }}</span></td></tr>
          </tbody></table>
        </div>
        <div class="subject360-signal-list"><div><b>向度判斷</b><p><span class="subject360-priority" :class="selectedPriority.level === '高優先' ? 'high' : selectedPriority.level === '中優先' ? 'medium' : 'observe'">{{ selectedPriority.level }}</span> {{ selectedPriority.reasons.join('；') || '目前沒有明顯差距' }}</p></div><div><b>資料解讀</b><p>聯結向度用來導航，仍要回到題目選項與學生資料確認教學問題。</p></div></div>
      </article>
    </div>
    <SubjectItemDialog :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" />
  </div>
</template>
