<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { formatPercent, formatPoints, getClassIds, getClassOverall, getLinkedDimensions, getLinkedDimensionStat, getStudentsForLinkedDimension, linkedDimensionPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  visibleClassIds: { type: Array, default: () => [] }
});

const emit = defineEmits(['select-class', 'select-student']);
const selectedDimension = ref('');
const dimensions = computed(() => getLinkedDimensions(props.subject));
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedDimension.value) || dimensions.value[0]);
const classScope = computed(() => props.visibleClassIds.length ? props.visibleClassIds : getClassIds(props.subject));
const comparisonLabel = computed(() => classScope.value.length === getClassIds(props.subject).length ? '全校' : '可見範圍');
const dimensionCards = computed(() => dimensions.value.map((dimension) => linkedDimensionPriority(props.subject, dimension, props.selectedClasses, classScope.value)));
const classRows = computed(() => classScope.value.map((classId) => ({ classId, stat: getClassOverall(props.subject, classId) })).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)));
const dimensionRows = computed(() => activeDimension.value ? classScope.value.map((classId) => {
  const stat = getLinkedDimensionStat(props.subject, activeDimension.value, [classId]);
  return { classId, stat, students: getStudentsForLinkedDimension(props.subject, [classId], activeDimension.value) };
}).sort((a, b) => (a.stat?.rate ?? 1) - (b.stat?.rate ?? 1)) : []);
function dimensionColor(rate) {
  if (rate == null) return '#cbd7e5';
  if (rate < 0.6) return '#c8791f';
  if (rate < 0.75) return '#6d9dbd';
  return '#2f6fb1';
}
const dimensionTreemap = computed(() => {
  const priorityByKey = new Map(dimensionCards.value.map((card) => [card.dimension.key, card]));
  const leaf = (dimension) => {
    const priority = priorityByKey.get(dimension.key);
    const selected = priority?.selected?.rate;
    return {
      name: dimension.cognitiveKey || dimension.label || dimension.key,
      value: Math.max(dimension.items.length, 1),
      dimensionKey: dimension.key,
      rate: selected,
      gap: priority?.gap,
      itemCount: dimension.items.length,
      itemStyle: {
        color: dimensionColor(selected),
        borderColor: activeDimension.value?.key === dimension.key ? '#17243d' : '#fff',
        borderWidth: activeDimension.value?.key === dimension.key ? 4 : 2
      }
    };
  };
  if (!hasCognitive.value) return dimensions.value.map(leaf);
  const groups = new Map();
  dimensions.value.forEach((dimension) => {
    const key = dimension.contentKey || dimension.key;
    if (!groups.has(key)) groups.set(key, { name: key, children: [] });
    groups.get(key).children.push(leaf(dimension));
  });
  return [...groups.values()];
});
const dimensionTreemapChart = computed(() => ({
  animation: false,
  tooltip: {
    formatter: (params) => {
      const data = params.data;
      if (!data?.dimensionKey) return `${data?.name || ''}<br/>內容向度群組`;
      return `${data.name}<br/>題數：${data.itemCount}<br/>所選範圍：${formatPercent(data.rate)}<br/>與${comparisonLabel.value}：${formatPoints(data.gap)}`;
    }
  },
  series: [{
    type: 'treemap',
    data: dimensionTreemap.value,
    roam: false,
    nodeClick: false,
    breadcrumb: { show: false },
    squareRatio: 1.15,
    visibleMin: 1,
    upperLabel: { show: hasCognitive.value, height: 25, color: '#17243d', fontSize: 12, fontWeight: 800 },
    label: { show: true, formatter: (params) => params.data?.dimensionKey ? `${params.data.name}\n${formatPercent(params.data.rate)}` : params.name, color: '#fff', fontSize: 12, fontWeight: 800, overflow: 'truncate' },
    itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3 },
    levels: [{ itemStyle: { borderColor: '#fff', borderWidth: 4, gapWidth: 4 }, label: { show: false } }, { itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 } }]
  }]
}));
const matrixRows = computed(() => classScope.value.map((classId) => ({
  classId,
  cells: dimensions.value.map((dimension) => ({
    dimension,
    stat: getLinkedDimensionStat(props.subject, dimension, [classId])
  }))
})));
const evidenceCell = ref(null);
const evidenceDimension = computed(() => dimensions.value.find((dimension) => dimension.key === evidenceCell.value?.dimensionKey));
const evidenceStudents = computed(() => evidenceCell.value && evidenceDimension.value
  ? getStudentsForLinkedDimension(props.subject, [evidenceCell.value.classId], evidenceDimension.value)
  : []);
watch(() => props.selectedClasses, (classes) => {
  if (evidenceCell.value && !classes.includes(evidenceCell.value.classId)) evidenceCell.value = null;
}, { deep: true });
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
  if (evidenceCell.value && evidenceCell.value.dimensionKey !== dimension.key) evidenceCell.value = null;
}
function treemapClick(params) {
  const dimension = dimensions.value.find((candidate) => candidate.key === params.data?.dimensionKey);
  if (dimension) chooseDimension(dimension);
}
function showEvidence(classId) {
  if (activeDimension.value) evidenceCell.value = { classId, dimensionKey: activeDimension.value.key };
}
function chartClick(params) {
  if (params.data?.dimensionKey && params.data?.classId) {
    const dimension = dimensions.value.find((candidate) => candidate.key === params.data.dimensionKey);
    if (!dimension) return;
    chooseDimension(dimension);
    evidenceCell.value = { classId: params.data.classId, dimensionKey: dimension.key };
  } else if (params.data?.classId) {
    evidenceCell.value = null;
    emit('select-class', params.data.classId);
  }
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>班級 × 能力</h2><p>{{ hasCognitive ? '數學同時顯示內容與認知向度；其他科目依內容向度呈現。' : '依內容向度查看班級差異，再查看題目與學生資料。' }}</p></div>
      <span class="subject360-badge">{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</span>
    </div>
    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>班級整體排序</h3><span>答對率低到高</span></div>
        <div class="subject360-class-ranking">
          <button v-for="(row, index) in classRows" :key="row.classId" type="button" class="subject360-class-rank-row" @click="emit('select-class', row.classId)"><span class="subject360-class-rank">{{ index + 1 }}</span><span class="subject360-class-name">{{ row.classId }} 班</span><i><em :style="{ width: `${Math.max(1, (row.stat.rate || 0) * 100)}%` }" :class="{ low: row.stat.rate < 0.6 }" /></i><strong>{{ formatPercent(row.stat.rate) }}</strong></button>
        </div>
        <p class="subject360-caption">點擊班級可鎖定目前分析範圍；向度資料請查看右側圖表。</p>
      </article>
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>向度分布</h3><span>面積＝題數・色彩＝答對率</span></div>
        <Subject360Chart v-if="dimensions.length" :option="dimensionTreemapChart" :height="320" :aria-label="hasCognitive ? '內容與認知聯結向度樹狀圖' : '內容向度樹狀圖'" @chart-click="treemapClick" />
        <p v-else class="subject360-empty">目前沒有可用向度資料。</p>
        <p class="subject360-caption">數學依內容向度分組、認知向度分格；點擊格子查看題目與班級資料。</p>
      </article>
    </div>

    <article class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ hasCognitive ? '內容 × 認知熱圖' : '內容向度熱圖' }}</h3><span>點擊格子查看需要確認的學生</span></div>
      <Subject360Chart :option="matrixChart" :height="380" :aria-label="hasCognitive ? '內容與認知向度班級熱圖' : '內容向度班級熱圖'" @chart-click="chartClick" />
      <div v-if="evidenceCell && evidenceDimension" class="subject360-student-evidence">
        <div class="subject360-card-head"><h3>{{ evidenceCell.classId }} 班・{{ evidenceDimension.label || evidenceDimension.key }}</h3><span>向度答對率低於 60%</span></div>
        <div v-if="evidenceStudents.length" class="subject360-student-evidence-list">
          <button v-for="row in evidenceStudents.slice(0, 12)" :key="row.student.id" type="button" @click="emit('select-student', row.student.id)"><span>{{ row.student.class }}班 {{ row.student.seat }}號</span><strong>{{ formatPercent(row.student.score) }}</strong><small>向度 {{ formatPercent(row.stat.rate) }}</small></button>
        </div>
        <p v-else class="subject360-empty">目前沒有低於 60% 的學生；仍可從上方「查詢學生」查看個別資料。</p>
      </div>
      <p class="subject360-caption">同一個內容向度會依認知層次拆成聯結格；格子內容僅供教學定位參考。</p>
    </article>

    <article v-if="activeDimension" class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ activeDimension.label || activeDimension.key }}｜班級表現</h3><span>{{ activeDimension.description }}</span></div>
        <div class="subject360-class-table">
          <div v-for="row in dimensionRows" :key="row.classId" class="subject360-class-table-row">
            <button type="button" @click="emit('select-class', row.classId)"><span>{{ row.classId }} 班</span><i><em :style="{ width: `${Math.max(1, (row.stat?.rate || 0) * 100)}%` }" :class="{ low: row.stat?.rate < 0.6 }" /></i><strong>{{ formatPercent(row.stat?.rate) }}</strong><small>{{ row.stat?.valid || 0 }} 答</small></button>
            <button type="button" class="subject360-student-trigger" :disabled="!row.students.length" @click.stop="showEvidence(row.classId)">{{ row.students.length }} 人需確認</button>
          </div>
        </div>
    </article>
  </div>
</template>
