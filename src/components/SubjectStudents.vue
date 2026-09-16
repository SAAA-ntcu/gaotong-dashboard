<script setup>
import { computed, ref, watch } from 'vue';
import Subject360Chart from './Subject360Chart.vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, getClassStudents, getDimensions, getOverall, getStudentById, getStudentDimension, getStudentProfile } from '../data/subject360';

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

function dimensionChart(type) {
  const rows = getDimensions(props.subject, type).map((dimension) => {
    const studentRow = student.value ? getStudentDimension(props.subject, student.value, type, dimension) : null;
    return { dimension, studentRate: studentRow?.rate, classRate: student.value ? getOverall(props.subject, [student.value.class]).rate : null };
  });
  return {
    animation: false,
    grid: { left: 70, right: 22, top: 18, bottom: 30, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (value) => `${Number(value).toFixed(1)}%` },
    legend: { top: 0, data: ['學生', '班級'] },
    xAxis: { type: 'category', data: rows.map((row) => row.dimension.key), axisLabel: { interval: 0, rotate: rows.length > 5 ? 28 : 0 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { color: '#e5eaf1' } } },
    series: [
      { name: '學生', type: 'bar', data: rows.map((row) => row.studentRate == null ? null : Number((row.studentRate * 100).toFixed(1))), itemStyle: { color: '#2f6fb1' }, barMaxWidth: 22 },
      { name: '班級', type: 'line', data: rows.map((row) => row.classRate == null ? null : Number((row.classRate * 100).toFixed(1))), itemStyle: { color: '#b86616' }, lineStyle: { color: '#b86616', width: 2 } }
    ]
  };
}

const contentChart = computed(() => dimensionChart('content'));
const cognitiveChart = computed(() => dimensionChart('cognitive'));
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head"><div><h2>學生科目學習剖面</h2><p>只描述本次 {{ subject.label }} 作答反應，供教師主動下鑽使用。</p></div><label class="subject360-inline-control">選擇學生<select v-model="selectedStudentId"><option v-for="candidate in candidates" :key="candidate.id" :value="candidate.id">{{ candidate.class }}班 {{ candidate.seat }}號｜{{ candidate.id }}</option></select></label></div>
    <div v-if="student && profile" class="subject360-card">
      <div class="subject360-profile-head"><div><strong>{{ student.class }}班 {{ student.seat }}號</strong><span>學生代碼 {{ student.id }}｜目前範圍 {{ selectedClasses.join('、') }}班</span></div><span class="subject360-priority" :class="profile.weak.length >= 2 ? 'medium' : 'observe'">{{ profile.weak.length >= 2 ? '中優先' : '建議觀察' }}</span></div>
      <div class="subject360-profile-kpis"><div><span>整體表現</span><strong>{{ formatPercent(student.score) }}</strong><small>{{ formatCount(student.correctCount) }} / {{ formatCount(student.validCount) }} 有效題</small></div><div><span>與班級比較</span><strong>{{ formatPoints(student.score - (classOverall?.rate || 0)) }}</strong><small>班級 {{ formatPercent(classOverall?.rate) }}</small></div><div><span>與全校比較</span><strong>{{ formatPoints(student.score - (schoolOverall?.rate || 0)) }}</strong><small>全校 {{ formatPercent(schoolOverall?.rate) }}</small></div><div><span>錯誤／未答</span><strong>{{ profile.wrongItems.length }}</strong><small>未答 {{ profile.missing }} 題</small></div></div>
    </div>
    <div v-else class="subject360-notice info">請先選擇至少一個班級。</div>

    <div v-if="student && profile" class="subject360-grid subject360-grid-2 subject360-section-gap"><article class="subject360-card"><div class="subject360-card-head"><h3>內容向度</h3><span>N＝向度內有效作答</span></div><Subject360Chart v-if="contentChart.series[0].data.length" :option="contentChart" :height="330" aria-label="學生內容向度比較" /><div v-else class="subject360-notice info">本測驗未提供內容向度資料。</div></article><article class="subject360-card"><div class="subject360-card-head"><h3>認知向度</h3><span>依正式資料提供狀況呈現</span></div><Subject360Chart v-if="cognitiveChart.series[0].data.length" :option="cognitiveChart" :height="330" aria-label="學生認知向度比較" /><div v-else class="subject360-notice info">本測驗未提供認知向度資料。</div></article></div>

    <div v-if="student && profile" class="subject360-grid subject360-grid-2 subject360-section-gap"><article class="subject360-card"><div class="subject360-card-head"><h3>值得進一步確認的區域</h3><span>不等同固定能力判定</span></div><div v-if="profile.weak.length" class="subject360-tag-list"><span v-for="row in profile.weak" :key="row.key" class="subject360-tag emphasis">{{ row.key }}｜{{ formatPercent(row.rate) }}</span></div><div v-else class="subject360-notice info">目前沒有足夠差距形成單獨的確認方向。</div></article><article class="subject360-card"><div class="subject360-card-head"><h3>本次錯誤題目</h3><span>點題目查看證據</span></div><div v-if="profile.wrongItems.length" class="subject360-tag-list"><button v-for="item in profile.wrongItems.slice(0, 15)" :key="item.q" type="button" class="subject360-tag emphasis" @click="focusedQuestion = item.q">Q{{ item.q }}｜{{ item.short }}</button></div><div v-else class="subject360-notice good">本次沒有錯誤或未答題目。</div></article></div>

    <article v-if="student && profile" class="subject360-card subject360-section-gap"><div class="subject360-card-head"><h3>Q1～Q{{ subject.questionCount }} 作答</h3><span>綠＝答對｜紅＝答錯｜灰＝未答／無效</span></div><div class="subject360-item-grid"><button v-for="entry in allResponses" :key="entry.item.q" type="button" class="subject360-item-tile" :class="entry.status" @click="focusedQuestion = entry.item.q"><b>Q{{ entry.item.q }}</b><small>{{ entry.response == null ? '—' : ['A', 'B', 'C', 'D'][entry.response - 1] || entry.response }}</small></button></div></article>
    <SubjectItemDialog v-if="student" :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" />
  </div>
</template>
