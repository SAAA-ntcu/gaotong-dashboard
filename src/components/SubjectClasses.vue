<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import { formatPercent, formatPoints, getClassIds, getClassOverall, getLinkedDimensions, getLinkedDimensionStat, getStudentsForLinkedDimension, linkedDimensionPriority } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true }
});

const emit = defineEmits(['select-class', 'select-student']);
const selectedDimension = ref('');
const dimensions = computed(() => getLinkedDimensions(props.subject));
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedDimension.value) || dimensions.value[0]);
const classRows = computed(() => getClassIds(props.subject).map((classId) => ({ classId, stat: getClassOverall(props.subject, classId) })).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)));
const dimensionRows = computed(() => activeDimension.value ? getClassIds(props.subject).map((classId) => {
  const stat = getLinkedDimensionStat(props.subject, activeDimension.value, [classId]);
  return { classId, stat, students: getStudentsForLinkedDimension(props.subject, [classId], activeDimension.value) };
}).sort((a, b) => (a.stat?.rate ?? 1) - (b.stat?.rate ?? 1)) : []);
const dimensionCards = computed(() => dimensions.value.map((dimension) => linkedDimensionPriority(props.subject, dimension, props.selectedClasses)));
const matrixRows = computed(() => getClassIds(props.subject).map((classId) => ({
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
      <div><h2>班級 × 能力</h2><p>{{ hasCognitive ? '數學以內容向度 × 認知向度聯結呈現，不再把兩套分類拆開比較。' : '依內容向度定位班級差異，再下鑽到題目與學生證據。' }}</p></div>
      <span class="subject360-badge">{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</span>
    </div>

    <div class="subject360-grid subject360-grid-2">
      <article class="subject360-card">
        <div class="subject360-card-head"><h3>班級整體排序</h3><span>答對率低到高</span></div>
        <div class="subject360-class-table">
          <button v-for="row in classRows.slice(0, 8)" :key="row.classId" type="button" @click="emit('select-class', row.classId)"><span>{{ row.classId }} 班</span><i><em :style="{ width: `${Math.max(1, (row.stat.rate || 0) * 100)}%` }" :class="{ low: row.stat.rate < 0.6 }" /></i><strong>{{ formatPercent(row.stat.rate) }}</strong><small>整體</small></button>
        </div>
        <p class="subject360-caption">點擊班級可鎖定目前分析範圍；詳細定位回到下方聯結熱圖。</p>
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
      <div class="subject360-card-head"><h3>{{ hasCognitive ? '內容 × 認知熱圖' : '內容向度熱圖' }}</h3><span>點擊格子查看需要確認的學生</span></div>
      <Subject360Chart :option="matrixChart" :height="380" :aria-label="hasCognitive ? '內容與認知向度班級熱圖' : '內容向度班級熱圖'" @chart-click="chartClick" />
      <div v-if="evidenceCell && evidenceDimension" class="subject360-student-evidence">
        <div class="subject360-card-head"><h3>{{ evidenceCell.classId }} 班・{{ evidenceDimension.label || evidenceDimension.key }}</h3><span>向度答對率低於 60% 的學生</span></div>
        <div v-if="evidenceStudents.length" class="subject360-student-evidence-list">
          <button v-for="row in evidenceStudents.slice(0, 12)" :key="row.student.id" type="button" @click="emit('select-student', row.student.id)"><span>{{ row.student.class }}班 {{ row.student.seat }}號</span><strong>{{ formatPercent(row.student.score) }}</strong><small>向度 {{ formatPercent(row.stat.rate) }}</small></button>
        </div>
        <p v-else class="subject360-empty">目前沒有低於 60% 的學生；仍可從上方「查詢學生」查看個別證據。</p>
      </div>
      <p class="subject360-caption">同一個內容向度會依認知層次拆成聯結格；這些格子是教學定位線索，不是單獨能力判定。</p>
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
