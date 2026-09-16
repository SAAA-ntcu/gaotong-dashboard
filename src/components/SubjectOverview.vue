<script setup>
import { computed } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { dimensionPriority, formatCount, formatPercent, formatPoints, getClassIds, getClassOverall, getClassStudents, getDimensions, getOverall, itemPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  scopeLabel: { type: String, required: true }
});

const emit = defineEmits(['select-class', 'open-page', 'open-ability', 'open-item']);

const overall = computed(() => getOverall(props.subject, props.selectedClasses));
const selectedStudents = computed(() => getClassStudents(props.subject, props.selectedClasses));
const classRows = computed(() => getClassIds(props.subject).map((classId) => ({ classId, stat: getClassOverall(props.subject, classId) })).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)));
const dimensions = computed(() => ['content', 'cognitive'].flatMap((type) => getDimensions(props.subject, type).map((dimension) => ({ ...dimensionPriority(props.subject, type, dimension.key, props.selectedClasses), type }))));
const items = computed(() => props.subject.items.map((item) => itemPriority(props.subject, item.q, props.selectedClasses)).sort((a, b) => b.signals - a.signals || (a.selected.rate ?? 1) - (b.selected.rate ?? 1)));
const topClass = computed(() => classRows.value[0]);
const topDimension = computed(() => dimensions.value.sort((a, b) => (a.selected.rate ?? 1) - (b.selected.rate ?? 1))[0]);
const topItem = computed(() => items.value[0]);
const watchDimensions = computed(() => dimensions.value.filter((row) => row.level !== '建議觀察').length);
const highItems = computed(() => items.value.filter((row) => row.level === '高優先').length);

const classChart = computed(() => ({
  animation: false,
  grid: { left: 42, right: 28, top: 18, bottom: 22, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  yAxis: { type: 'category', data: classRows.value.map((row) => `${row.classId} 班`) },
  series: [{ type: 'bar', data: classRows.value.map((row) => ({ value: Number(((row.stat.rate || 0) * 100).toFixed(1)), classId: row.classId, itemStyle: { color: row.stat.rate < 0.6 ? '#b86616' : '#2f6fb1' } })), barMaxWidth: 22 }]
}));

function chartClick(params) {
  if (params.data?.classId) emit('select-class', params.data.classId);
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>決策總覽</h2><p>{{ scopeLabel }}｜先找出最值得處理的問題，再沿著證據鏈落到題目與學生。</p></div>
      <span class="subject360-badge">三步決策路徑</span>
    </div>

    <div class="subject360-kpi-grid">
      <div class="subject360-kpi"><span>分析班級</span><strong>{{ selectedClasses.length }}</strong><small>{{ scopeLabel }}</small></div>
      <div class="subject360-kpi"><span>有效學生數</span><strong>{{ formatCount(selectedStudents.length) }}</strong><small>所選班級學生列</small></div>
      <div class="subject360-kpi"><span>整體答對率</span><strong>{{ formatPercent(overall.rate) }}</strong><small>有效作答為分母</small></div>
      <div class="subject360-kpi"><span>待關注向度</span><strong>{{ watchDimensions }}</strong><small>內容／認知向度</small></div>
      <div class="subject360-kpi"><span>高優先試題</span><strong>{{ highItems }}</strong><small>多項證據支持</small></div>
    </div>

    <div class="subject360-decision-card">
      <span>三步決策路徑</span>
      <p>先查看 <button type="button" @click="emit('open-page', 'classes')">{{ topClass ? `${topClass.classId} 班` : '班級比較' }}</button> → <button type="button" @click="topDimension && emit('open-ability', topDimension)">{{ topDimension?.dimension?.key || '能力向度' }}</button> → <button type="button" @click="topItem && emit('open-item', topItem.item.q)">Q{{ topItem?.item.q || '—' }} {{ topItem?.item.short || '' }}</button></p>
      <small>這是一個優先查看順序，不是固定能力判定；單一訊號仍需回到題目與學生資料確認。</small>
    </div>

    <div class="subject360-grid subject360-grid-3">
      <article class="subject360-card subject360-focus-card"><span>第一步：鎖定班級</span><strong>{{ topClass ? `${topClass.classId} 班` : '—' }}</strong><p>{{ topClass ? formatPercent(topClass.stat.rate) + ' 整體答對率' : '目前沒有可排序的班級訊號' }}</p><button type="button" @click="emit('open-page', 'classes')">查看班級 × 能力 →</button></article>
      <article class="subject360-card subject360-focus-card"><span>第二步：確認能力</span><strong>{{ topDimension?.dimension?.key || '—' }}</strong><p>{{ topDimension ? formatPoints(topDimension.gap) + ' vs 全校' : '目前沒有可用向度' }}</p><button type="button" @click="topDimension && emit('open-ability', topDimension)">查看能力診斷 →</button></article>
      <article class="subject360-card subject360-focus-card"><span>第三步：回到題目</span><strong>Q{{ topItem?.item.q || '—' }} {{ topItem?.item.short || '' }}</strong><p>{{ topItem ? formatPercent(topItem.selected.rate) + ' 所選範圍答對率' : '目前沒有可用題目' }}</p><button type="button" @click="topItem && emit('open-item', topItem.item.q)">查看試題證據 →</button></article>
    </div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>班級訊號排序</h3><span>點擊班級進入班級 × 能力</span></div>
        <Subject360Chart :option="classChart" :height="320" aria-label="班級整體答對率" @chart-click="chartClick" />
        <p class="subject360-caption">條長代表答對率；色彩只作為優先查看提示，不等同固定能力判定。</p>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>優先訊號摘要</h3><span>目前最需要看的少數訊號</span></div>
        <div class="subject360-signal-list">
          <div><b>共同現象</b><p>{{ highItems ? `共有 ${highItems} 題需要優先回到題目確認。` : '目前沒有足夠證據支持共同偏低。' }}</p></div>
          <div><b>班級差異</b><p>{{ topClass ? `${topClass.classId} 班答對率 ${formatPercent(topClass.stat.rate)}，建議先查看班級比較。` : '目前沒有可排序的班級訊號。' }}</p></div>
          <div><b>選項線索</b><p>{{ topItem?.selected?.topWrong ? `Q${topItem.item.q} 的主要錯誤選項集中於 ${['A', 'B', 'C', 'D'][topItem.selected.topWrong.option - 1]}。` : '目前沒有明顯集中的錯誤選項。' }}</p></div>
        </div>
      </article>
    </div>
  </div>
</template>
