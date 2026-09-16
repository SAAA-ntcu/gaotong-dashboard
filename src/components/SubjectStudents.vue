<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, getClassStudents, getLinkedDimensions, getLinkedDimensionStat, getOverall, getStudentById, getStudentProfile } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  initialStudentId: { type: String, default: '' }
});

const candidates = computed(() => getClassStudents(props.subject, props.selectedClasses));
const selectedStudentId = ref(props.initialStudentId || '');
const focusedQuestion = ref(null);
watch([candidates, () => props.initialStudentId], () => {
  if (props.initialStudentId && candidates.value.some((student) => student.id === props.initialStudentId)) selectedStudentId.value = props.initialStudentId;
  if (!candidates.value.some((student) => student.id === selectedStudentId.value)) selectedStudentId.value = candidates.value[0]?.id || '';
}, { immediate: true });

const student = computed(() => getStudentById(props.subject, selectedStudentId.value) || candidates.value[0] || null);
const profile = computed(() => getStudentProfile(props.subject, student.value));
const classOverall = computed(() => student.value ? getOverall(props.subject, [student.value.class]) : null);
const schoolOverall = computed(() => getOverall(props.subject, props.subject.classIds));
const allResponses = computed(() => props.subject.items.map((item) => ({ item, response: student.value?.responses[item.q - 1], status: student.value?.responses[item.q - 1] == null ? 'missing' : student.value.responses[item.q - 1] === item.answer ? 'correct' : 'wrong' })));

const linkedChart = computed(() => {
  const dimensions = getLinkedDimensions(props.subject);
  const rows = dimensions.map((dimension) => {
    const studentRow = profile.value?.linked.find((row) => row.key === dimension.key);
    const classRate = student.value ? getLinkedDimensionStat(props.subject, dimension, [student.value.class]).rate : null;
    return { dimension, studentRate: studentRow?.rate, classRate };
  });
  return {
    animation: false,
    grid: { left: 48, right: 20, top: 25, bottom: 82, containLabel: true },
    tooltip: {
      position: 'top',
      formatter: (params) => `${params.value[1] === 0 ? '學生' : '班級'}<br/>${rows[params.value[0]]?.dimension.label || rows[params.value[0]]?.dimension.key || ''}<br/><strong>${Number(params.value[2]).toFixed(1)}%</strong>`
    },
    xAxis: { type: 'category', data: rows.map((row) => row.dimension.label || row.dimension.key), axisLabel: { interval: 0, rotate: 35 } },
    yAxis: { type: 'category', data: ['學生', '班級'] },
    visualMap: { min: 0, max: 100, show: false, inRange: { color: ['#f7f9fc', '#c5dced', '#2f6fb1'] } },
    series: [{
      type: 'heatmap',
      data: rows.flatMap((row, x) => [
        { value: [x, 0, Number(((row.studentRate || 0) * 100).toFixed(1))] },
        { value: [x, 1, Number(((row.classRate || 0) * 100).toFixed(1))] }
      ]),
      label: { show: true, formatter: (params) => `${Number(params.value[2]).toFixed(0)}%`, color: '#17243d', fontSize: 10 }
    }]
  };
});
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head"><div><h2>學生剖面</h2><p>只描述本次 {{ subject.label }} 作答反應，供教師從分組或題目證據主動下鑽。</p></div><label class="subject360-inline-control">選擇學生<select v-model="selectedStudentId"><option v-for="candidate in candidates" :key="candidate.id" :value="candidate.id">{{ candidate.class }}班 {{ candidate.seat }}號｜{{ candidate.id }}</option></select></label></div>
    <div v-if="student && profile" class="subject360-card">
      <div class="subject360-profile-head"><div><strong>{{ student.class }}班 {{ student.seat }}號</strong><span>學生代碼 {{ student.id }}｜目前範圍 {{ selectedClasses.join('、') }}班</span></div><span class="subject360-priority" :class="profile.weak.length >= 2 ? 'medium' : 'observe'">{{ profile.weak.length >= 2 ? '中優先' : '建議觀察' }}</span></div>
      <div class="subject360-profile-kpis"><div><span>整體表現</span><strong>{{ formatPercent(student.score) }}</strong><small>{{ formatCount(student.correctCount) }} / {{ formatCount(student.validCount) }} 有效題</small></div><div><span>與班級比較</span><strong>{{ formatPoints(student.score - (classOverall?.rate || 0)) }}</strong><small>班級 {{ formatPercent(classOverall?.rate) }}</small></div><div><span>與全校比較</span><strong>{{ formatPoints(student.score - (schoolOverall?.rate || 0)) }}</strong><small>全校 {{ formatPercent(schoolOverall?.rate) }}</small></div><div><span>錯誤／未答</span><strong>{{ profile.wrongItems.length }}</strong><small>未答 {{ profile.missing }} 題</small></div></div>
    </div>
    <div v-else class="subject360-notice info">請先選擇至少一個班級。</div>
    <div v-if="student && profile" class="subject360-card subject360-section-gap"><div class="subject360-card-head"><h3>{{ subject.dimensions?.cognitive?.length ? '內容 × 認知學習熱圖' : '內容向度學習熱圖' }}</h3><span>學生與班級同一尺度比較</span></div><Subject360Chart v-if="linkedChart.series[0].data.length" :option="linkedChart" :height="360" :aria-label="subject.dimensions?.cognitive?.length ? '學生內容與認知聯結熱圖' : '學生內容向度熱圖'" /><div v-else class="subject360-notice info">本測驗未提供可用向度資料。</div><p class="subject360-caption">數學以內容 × 認知聯結顯示；藍色較深代表相對較高，仍應搭配題目證據解讀。</p></div>

    <div v-if="student && profile" class="subject360-grid subject360-grid-2 subject360-section-gap"><article class="subject360-card"><div class="subject360-card-head"><h3>值得進一步確認的區域</h3><span>不等同固定能力判定</span></div><div v-if="profile.weak.length" class="subject360-tag-list"><span v-for="row in profile.weak" :key="row.key" class="subject360-tag emphasis">{{ row.key }}｜{{ formatPercent(row.rate) }}</span></div><div v-else class="subject360-notice info">目前沒有足夠差距形成單獨的確認方向。</div></article><article class="subject360-card"><div class="subject360-card-head"><h3>本次錯誤題目</h3><span>點題目查看證據</span></div><div v-if="profile.wrongItems.length" class="subject360-tag-list"><button v-for="item in profile.wrongItems.slice(0, 15)" :key="item.q" type="button" class="subject360-tag emphasis" @click="focusedQuestion = item.q">Q{{ item.q }}｜{{ item.short }}</button></div><div v-else class="subject360-notice good">本次沒有錯誤或未答題目。</div></article></div>

    <article v-if="student && profile" class="subject360-card subject360-section-gap"><div class="subject360-card-head"><h3>Q1～Q{{ subject.questionCount }} 作答</h3><span>綠＝答對｜紅＝答錯｜灰＝未答／無效</span></div><div class="subject360-item-grid"><button v-for="entry in allResponses" :key="entry.item.q" type="button" class="subject360-item-tile" :class="entry.status" @click="focusedQuestion = entry.item.q"><b>Q{{ entry.item.q }}</b><small>{{ entry.response == null ? '—' : ['A', 'B', 'C', 'D'][entry.response - 1] || entry.response }}</small></button></div></article>
    <SubjectItemDialog v-if="student" :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" />
  </div>
</template>
