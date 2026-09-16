<script setup>
import { computed, ref } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { formatPercent, formatPoints, getClassIds, getClassOverall, getLinkedDimensions, getLinkedDimensionStat, getOverall, linkedDimensionPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true }
});

const emit = defineEmits(['select-class']);
const selectedDimension = ref('');
const dimensions = computed(() => getLinkedDimensions(props.subject));
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedDimension.value) || dimensions.value[0]);
const classRows = computed(() => getClassIds(props.subject).map((classId) => ({ classId, stat: getClassOverall(props.subject, classId) })).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)));
const dimensionRows = computed(() => activeDimension.value ? getClassIds(props.subject).map((classId) => ({ classId, stat: getLinkedDimensionStat(props.subject, activeDimension.value, [classId]) })).sort((a, b) => (a.stat?.rate ?? 1) - (b.stat?.rate ?? 1)) : []);
const dimensionCards = computed(() => dimensions.value.map((dimension) => linkedDimensionPriority(props.subject, dimension, props.selectedClasses)));
const matrixRows = computed(() => getClassIds(props.subject).map((classId) => ({
  classId,
  cells: dimensions.value.map((dimension) => ({
    dimension,
    stat: getLinkedDimensionStat(props.subject, dimension, [classId])
  }))
})));
const classScatter = computed(() => ({
  animation: false,
  grid: { left: 42, right: 25, top: 25, bottom: 38, containLabel: true },
  tooltip: { trigger: 'item', formatter: (params) => `${params.data.classId} 班<br/>整體答對率：${formatPercent((params.value?.[1] || 0) / 100, 1)}` },
  xAxis: { type: 'category', data: classRows.value.map((row) => `${row.classId} 班`), axisLabel: { interval: 0 } },
  yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
  series: [{
    type: 'scatter',
    symbolSize: 18,
    data: classRows.value.map((row, index) => ({ value: [index, Number(((row.stat.rate || 0) * 100).toFixed(1))], classId: row.classId, itemStyle: { color: row.stat.rate < 0.6 ? '#b86616' : '#2f6fb1' } })),
    markLine: { symbol: 'none', label: { formatter: '全校基準' }, lineStyle: { color: '#7d8da3', type: 'dashed' }, data: [{ yAxis: Number(((getOverall(props.subject, getClassIds(props.subject)).rate || 0) * 100).toFixed(1)) }] }
  }]
}));
const matrixChart = computed(() => ({
  animation: false,
  grid: { left: 72, right: 24, top: 14, bottom: dimensions.value.length > 5 ? 78 : 35, containLabel: true },
  tooltip: {
    position: 'top',
    formatter: (params) => {
      const [x, y, rate] = params.value;
      return `${matrixRows.value[y]?.classId || ''} 班<br/>${dimensions.value[x]?.label || dimensions.value[x]?.key || ''}<br/><strong>${Number(rate).toFixed(1)}%</strong>`;
    }
  },
  xAxis: { type: 'category', data: dimensions.value.map((dimension) => dimension.label || dimension.key), axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'category', data: matrixRows.value.map((row) => `${row.classId} 班`) },
  visualMap: { min: 0, max: 100, show: false, inRange: { color: ['#fff0ed', '#fff3df', '#e5f5f3'] } },
  series: [{
    type: 'heatmap',
    data: matrixRows.value.flatMap((row, y) => row.cells.map((cell, x) => ({
      value: [x, y, Number(((cell.stat?.rate || 0) * 100).toFixed(1))],
      classId: row.classId,
      dimensionKey: cell.dimension.key
    }))),
    label: { show: true, formatter: (params) => `${Number(params.value[2]).toFixed(0)}%`, color: '#17243d', fontSize: 10 }
  }]
}));

function chooseDimension(dimension) {
  selectedDimension.value = dimension.key;
}
function chartClick(params) {
  if (params.data?.dimensionKey) {
    chooseDimension(dimensions.value.find((dimension) => dimension.key === params.data.dimensionKey) || dimensions.value[0]);
  } else if (params.data?.classId) {
    emit('select-class', params.data.classId);
  }
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>班級 × 能力</h2><p>{{ hasCognitive ? '數學以內容向度 × 認知向度聯結呈現，不再把兩套分類拆開比較。' : '依內容向度定位班級差異，再下鑽到題目與學生證據。' }}</p></div>
      <span class="subject360-badge">{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</span>
    </div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>班級整體位置</h3><span>散點越低越優先確認</span></div>
        <Subject360Chart :option="classScatter" :height="300" aria-label="各班整體答對率散點圖" @chart-click="chartClick" />
        <p class="subject360-caption">虛線是全校基準；點擊班級可鎖定目前分析範圍。</p>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>聯結向度快速檢視</h3><span>點擊向度查看題目組成</span></div>
        <div class="subject360-dimension-list">
          <button v-for="card in dimensionCards" :key="card.dimension.key" type="button" :class="{ active: activeDimension?.key === card.dimension.key }" @click="chooseDimension(card.dimension)">
            <span><strong>{{ card.dimension.label || card.dimension.key }}</strong><small>{{ card.dimension.items.length }} 題・{{ formatPoints(card.gap) }} vs 全校</small></span><b>{{ formatPercent(card.selected?.rate) }}</b>
          </button>
        </div>
      </article>
    </div>

    <article class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ hasCognitive ? '內容 × 認知熱圖' : '內容向度熱圖' }}</h3><span>橫軸向度、縱軸班級；滑過查看精確答對率</span></div>
      <Subject360Chart :option="matrixChart" :height="380" :aria-label="hasCognitive ? '內容與認知向度班級熱圖' : '內容向度班級熱圖'" @chart-click="chartClick" />
      <p class="subject360-caption">同一個內容向度會依認知層次拆成聯結格；這些格子是教學定位線索，不是單獨能力判定。</p>
    </article>

    <article v-if="activeDimension" class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ activeDimension.label || activeDimension.key }}｜班級表現</h3><span>{{ activeDimension.description }}</span></div>
      <div class="subject360-class-table">
        <button v-for="row in dimensionRows" :key="row.classId" type="button" @click="emit('select-class', row.classId)"><span>{{ row.classId }} 班</span><i><em :style="{ width: `${Math.max(1, (row.stat?.rate || 0) * 100)}%` }" :class="{ low: row.stat?.rate < 0.6 }" /></i><strong>{{ formatPercent(row.stat?.rate) }}</strong><small>{{ row.stat?.valid || 0 }} 答</small></button>
      </div>
    </article>
  </div>
</template>
