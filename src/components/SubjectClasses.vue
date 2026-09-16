<script setup>
import { computed, ref } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { dimensionPriority, formatPercent, formatPoints, getClassIds, getClassOverall, getDimensions, getDimensionStat } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true }
});

const emit = defineEmits(['select-class', 'open-ability']);
const dimensionType = ref('content');
const selectedDimension = ref('');

const dimensions = computed(() => getDimensions(props.subject, dimensionType.value));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedDimension.value) || dimensions.value[0]);
const classRows = computed(() => getClassIds(props.subject).map((classId) => ({ classId, stat: getClassOverall(props.subject, classId) })).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)));
const dimensionRows = computed(() => activeDimension.value ? getClassIds(props.subject).map((classId) => ({ classId, stat: getDimensionStat(props.subject, dimensionType.value, activeDimension.value.key, [classId]) })).sort((a, b) => (a.stat?.rate ?? 1) - (b.stat?.rate ?? 1)) : []);
const dimensionCards = computed(() => dimensions.value.map((dimension) => ({ ...dimension, priority: dimensionPriority(props.subject, dimensionType.value, dimension.key, props.selectedClasses) })));
const chart = computed(() => ({
  animation: false,
  grid: { left: 42, right: 28, top: 18, bottom: 22, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  yAxis: { type: 'category', data: dimensionRows.value.map((row) => `${row.classId} 班`) },
  series: [{ type: 'bar', data: dimensionRows.value.map((row) => ({ value: Number(((row.stat?.rate || 0) * 100).toFixed(1)), classId: row.classId, itemStyle: { color: row.stat?.rate < 0.6 ? '#b86616' : '#2f6fb1' } })), barMaxWidth: 22 }]
}));

function chooseDimension(dimension) {
  selectedDimension.value = dimension.key;
}
function setType(type) {
  dimensionType.value = type;
  selectedDimension.value = '';
}
function chartClick(params) {
  if (params.data?.classId) emit('select-class', params.data.classId);
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>班級比較</h2><p>比較班級整體與正式向度，辨認多班共同與特定班級差異。</p></div>
      <div class="subject360-segmented"><button type="button" :class="{ active: dimensionType === 'content' }" @click="setType('content')">內容向度</button><button type="button" :class="{ active: dimensionType === 'cognitive' }" :disabled="!getDimensions(subject, 'cognitive').length" @click="setType('cognitive')">認知向度</button></div>
    </div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>班級整體答對率</h3><span>點擊班級可切換目前範圍</span></div>
        <Subject360Chart :option="{ ...chart, yAxis: { ...chart.yAxis, data: classRows.map((row) => `${row.classId} 班`) }, series: [{ ...chart.series[0], data: classRows.map((row) => ({ value: Number(((row.stat.rate || 0) * 100).toFixed(1)), classId: row.classId, itemStyle: { color: row.stat.rate < 0.6 ? '#b86616' : '#2f6fb1' } })) }] }" :height="320" aria-label="各班整體答對率" @chart-click="chartClick" />
        <p class="subject360-caption">排序由答對率低到高，方便先查看需要較多證據確認的班級。</p>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>正式向度快速檢視</h3><span>點擊向度查看題目組成</span></div>
        <div class="subject360-dimension-list">
          <button v-for="card in dimensionCards" :key="card.key" type="button" :class="{ active: activeDimension?.key === card.key }" @click="chooseDimension(card)">
            <span><strong>{{ card.key }}</strong><small>{{ card.items.length }} 題・{{ formatPoints(card.priority.gap) }} vs 所選範圍</small></span><b>{{ formatPercent(card.priority.selected?.rate) }}</b>
          </button>
        </div>
      </article>
    </div>

    <article v-if="activeDimension" class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ activeDimension.key }}｜班級表現</h3><span>{{ activeDimension.description }}</span></div>
      <Subject360Chart :option="chart" :height="300" :aria-label="`${activeDimension.key} 班級答對率`" @chart-click="chartClick" />
      <div class="subject360-class-table">
        <button v-for="row in dimensionRows" :key="row.classId" type="button" @click="emit('select-class', row.classId)"><span>{{ row.classId }} 班</span><i><em :style="{ width: `${Math.max(1, (row.stat?.rate || 0) * 100)}%` }" :class="{ low: row.stat?.rate < 0.6 }" /></i><strong>{{ formatPercent(row.stat?.rate) }}</strong><small>{{ row.stat?.valid || 0 }} 答</small></button>
      </div>
    </article>
  </div>
</template>
