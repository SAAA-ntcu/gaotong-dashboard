<script setup>
import { computed, ref, watch } from 'vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import { formatCount, formatPercent, formatPoints, getClassStudents, getLinkedDimensions, getLinkedDimensionStat, getOverall, getStudentProfile } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  visibleClassIds: { type: Array, default: () => [] },
  initialStudentId: { type: String, default: '' },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'select-class', 'select-student']);

const candidates = computed(() => getClassStudents(props.subject, props.selectedClasses));
const selectedStudentId = ref(props.initialStudentId || '');
const focusedQuestion = ref(null);
const dimensions = computed(() => getLinkedDimensions(props.subject));
const student = computed(() => candidates.value.find((candidate) => candidate.id === selectedStudentId.value) || candidates.value[0] || null);
const profile = computed(() => getStudentProfile(props.subject, student.value));
const classOverall = computed(() => student.value ? getOverall(props.subject, [student.value.class]) : null);
const classScope = computed(() => props.visibleClassIds.length ? props.visibleClassIds : props.subject.classIds);
const schoolOverall = computed(() => getOverall(props.subject, classScope.value));
const comparisonLabel = computed(() => classScope.value.length === props.subject.classIds.length ? '全校' : '可見範圍');
const allResponses = computed(() => props.subject.items.map((item) => ({
  item,
  response: student.value?.responses[item.q - 1],
  status: student.value?.responses[item.q - 1] == null ? 'missing' : student.value.responses[item.q - 1] === item.answer ? 'correct' : 'wrong'
})));
const linkedRows = computed(() => dimensions.value.map((dimension) => {
  const studentRow = profile.value?.linked.find((row) => row.key === dimension.key);
  const classRate = student.value ? getLinkedDimensionStat(props.subject, dimension, [student.value.class]).rate : null;
  return { dimension, studentRate: studentRow?.rate, classRate };
}));

watch([candidates, () => props.initialStudentId], () => {
  if (props.initialStudentId && candidates.value.some((candidate) => candidate.id === props.initialStudentId)) selectedStudentId.value = props.initialStudentId;
  if (!candidates.value.some((candidate) => candidate.id === selectedStudentId.value)) selectedStudentId.value = candidates.value[0]?.id || '';
}, { immediate: true });

function chooseStudent(studentId) {
  selectedStudentId.value = studentId;
  focusedQuestion.value = null;
  emit('select-student', studentId);
}
function chooseQuestion(question) {
  focusedQuestion.value = question;
}
function close() {
  focusedQuestion.value = null;
  emit('close');
}
</script>

<template>
  <div v-if="visible" class="subject360-drawer" role="dialog" aria-modal="true" aria-label="學生作答資料">
    <button class="subject360-drawer-backdrop" type="button" aria-label="關閉學生作答資料" @click="close" />
    <aside class="subject360-drawer-panel">
      <header class="subject360-drawer-head">
        <div>
          <span class="subject360-kicker">學生作答資料</span>
          <h2>學生作答資料</h2>
          <p>從目前班級、向度或題目資料查看學生表現；單次作答不代表固定能力。</p>
        </div>
        <button class="icon-button" type="button" aria-label="關閉學生作答資料" @click="close">×</button>
      </header>

      <div class="subject360-drawer-body">
        <label class="subject360-inline-control subject360-drawer-student-select">目前學生
          <select v-model="selectedStudentId" @change="chooseStudent(selectedStudentId)">
            <option v-for="candidate in candidates" :key="candidate.id" :value="candidate.id">{{ candidate.class }}班 {{ candidate.seat }}號｜{{ candidate.id }}</option>
          </select>
        </label>

        <template v-if="student && profile">
          <section class="subject360-drawer-profile">
            <div class="subject360-profile-head">
              <div><strong>{{ student.class }}班 {{ student.seat }}號</strong><span>學生代碼 {{ student.id }}｜目前範圍 {{ selectedClasses.join('、') }}班</span></div>
              <span class="subject360-priority" :class="profile.weak.length >= 2 ? 'medium' : 'observe'">{{ profile.weak.length >= 2 ? '需查看' : '觀察' }}</span>
            </div>
            <div class="subject360-profile-kpis">
              <div><span>整體表現</span><strong>{{ formatPercent(student.score) }}</strong><small>{{ formatCount(student.correctCount) }} / {{ formatCount(student.validCount) }} 有效題</small></div>
              <div><span>與班級比較</span><strong>{{ formatPoints(student.score - (classOverall?.rate || 0)) }}</strong><small>班級 {{ formatPercent(classOverall?.rate) }}</small></div>
              <div><span>與{{ comparisonLabel }}比較</span><strong>{{ formatPoints(student.score - (schoolOverall?.rate || 0)) }}</strong><small>{{ comparisonLabel }} {{ formatPercent(schoolOverall?.rate) }}</small></div>
              <div><span>錯誤／未答</span><strong>{{ profile.wrongItems.length }}</strong><small>未答 {{ profile.missing }} 題</small></div>
            </div>
          </section>

          <section class="subject360-card subject360-drawer-card">
            <div class="subject360-card-head"><h3>{{ subject.dimensions?.cognitive?.length ? '內容 × 認知學習比較' : '內容向度學習比較' }}</h3><span>學生 vs 所屬班級</span></div>
            <div class="subject360-student-dimension-list">
              <div v-for="row in linkedRows" :key="row.dimension.key" class="subject360-student-dimension-row">
                <div><strong>{{ row.dimension.label || row.dimension.key }}</strong><small>{{ row.dimension.description }}</small></div>
                <div class="subject360-student-dimension-values">
                  <span>學生 <b>{{ formatPercent(row.studentRate) }}</b><i><em :style="{ width: `${Math.max(1, (row.studentRate || 0) * 100)}%` }" :class="{ low: row.studentRate < 0.6 }" /></i></span>
                  <span>班級 <b>{{ formatPercent(row.classRate) }}</b><i><em :style="{ width: `${Math.max(1, (row.classRate || 0) * 100)}%` }" /></i></span>
                </div>
              </div>
            </div>
          </section>

          <div class="subject360-grid subject360-grid-2 subject360-drawer-card">
            <section class="subject360-card">
              <div class="subject360-card-head"><h3>值得進一步確認</h3><span>向度低於 60%</span></div>
              <div v-if="profile.weak.length" class="subject360-tag-list"><span v-for="row in profile.weak" :key="row.key" class="subject360-tag emphasis">{{ row.key }}｜{{ formatPercent(row.rate) }}</span></div>
              <p v-else class="subject360-empty">目前沒有足夠差距形成確認方向。</p>
            </section>
            <section class="subject360-card">
              <div class="subject360-card-head"><h3>本次錯誤題目</h3><span>點題目查看證據</span></div>
              <div v-if="profile.wrongItems.length" class="subject360-tag-list"><button v-for="item in profile.wrongItems.slice(0, 15)" :key="item.q" type="button" class="subject360-tag emphasis" @click="chooseQuestion(item.q)">Q{{ item.q }}</button></div>
              <p v-else class="subject360-empty">目前沒有錯誤或未答題目。</p>
            </section>
          </div>

          <section class="subject360-card subject360-drawer-card">
            <div class="subject360-card-head"><h3>Q1～Q{{ subject.questionCount }} 作答</h3><span>綠＝答對｜紅＝答錯｜灰＝未答</span></div>
            <div class="subject360-item-grid"><button v-for="entry in allResponses" :key="entry.item.q" type="button" class="subject360-item-tile" :class="entry.status" @click="chooseQuestion(entry.item.q)"><b>Q{{ entry.item.q }}</b><small>{{ entry.response == null ? '—' : ['A', 'B', 'C', 'D'][entry.response - 1] || entry.response }}</small></button></div>
          </section>
        </template>
        <div v-else class="subject360-notice info">目前範圍沒有可顯示的學生。</div>
      </div>
    </aside>
    <SubjectItemDialog v-if="student" :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible-class-ids="visibleClassIds" :visible="Boolean(focusedQuestion)" @close="focusedQuestion = null" @select-class="emit('select-class', $event)" @select-student="chooseStudent($event)" />
  </div>
</template>
