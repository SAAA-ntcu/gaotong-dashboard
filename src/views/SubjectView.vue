<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SubjectScopePicker from '../components/SubjectScopePicker.vue';
import SubjectOverview from '../components/SubjectOverview.vue';
import SubjectClasses from '../components/SubjectClasses.vue';
import SubjectAbility from '../components/SubjectAbility.vue';
import SubjectItems from '../components/SubjectItems.vue';
import SubjectGroups from '../components/SubjectGroups.vue';
import SubjectStudentDrawer from '../components/SubjectStudentDrawer.vue';
import { SUBJECT360_META, getClassIds, getClassStudents, getScopeLabel, loadSubject360 } from '../data/subject360';

const route = useRoute();
const router = useRouter();
const data = ref(null);
const error = ref('');
const activeTab = ref('overview');
const selectedSubjectId = ref('math');
const selectedClasses = ref([]);
const focusedItem = ref(null);
const focusedStudent = ref('');
const studentLookup = ref('');
const focusedAbility = ref('');
const tabs = [
  { id: 'overview', label: '決策總覽' },
  { id: 'classes', label: '班級 × 能力' },
  { id: 'ability', label: '能力診斷' },
  { id: 'items', label: '試題資料' },
  { id: 'groups', label: '教學分組' }
];
const subject = computed(() => data.value?.subjects?.[selectedSubjectId.value] || null);
const classIds = computed(() => getClassIds(subject.value));
const scopeLabel = computed(() => subject.value ? getScopeLabel(subject.value, selectedClasses.value) : '載入中');
const studentCandidates = computed(() => subject.value ? getClassStudents(subject.value, selectedClasses.value) : []);
const activeComponent = computed(() => ({ overview: SubjectOverview, classes: SubjectClasses, ability: SubjectAbility, items: SubjectItems, groups: SubjectGroups }[activeTab.value] || SubjectOverview));

function validTab(value) {
  return tabs.some((tab) => tab.id === value) ? value : 'overview';
}
function validSubject(value) {
  return data.value?.subjects?.[value] ? value : 'math';
}
function parseClasses(value, ids) {
  const requested = String(value || '').split(',').filter((id) => ids.includes(id));
  return requested.length ? requested : [...ids];
}
function syncFromRoute() {
  if (!data.value) return;
  selectedSubjectId.value = validSubject(route.query.subject);
  activeTab.value = validTab(route.query.tab);
  selectedClasses.value = parseClasses(route.query.class, getClassIds(data.value.subjects[selectedSubjectId.value]));
  const question = Number(route.query.item);
  focusedItem.value = Number.isInteger(question) && question > 0 ? question : null;
  focusedAbility.value = String(route.query.ability || '');
  focusedStudent.value = String(route.query.student || '');
  studentLookup.value = focusedStudent.value;
}
function writeRoute(extra = {}) {
  const query = { ...route.query, subject: selectedSubjectId.value, tab: activeTab.value, ...extra };
  const ids = getClassIds(subject.value);
  if (selectedClasses.value.length === ids.length) delete query.class;
  else query.class = selectedClasses.value.join(',');
  if (activeTab.value !== 'items' || !focusedItem.value) delete query.item;
  if (activeTab.value !== 'ability' || !focusedAbility.value) delete query.ability;
  if (!focusedStudent.value) delete query.student;
  router.replace({ name: 'subject', query });
}
function setTab(tab) {
  activeTab.value = tab;
  focusedItem.value = null;
  focusedStudent.value = '';
  focusedAbility.value = '';
  writeRoute();
}
function setSubject(subjectId) {
  selectedSubjectId.value = subjectId;
  selectedClasses.value = [...getClassIds(data.value.subjects[subjectId])];
  focusedItem.value = null;
  focusedStudent.value = '';
  focusedAbility.value = '';
  writeRoute();
}
function toggleClass(classId) {
  const next = selectedClasses.value.includes(classId)
    ? selectedClasses.value.filter((id) => id !== classId)
    : [...selectedClasses.value, classId];
  selectedClasses.value = next.length ? next.sort() : [...classIds.value];
  writeRoute();
}
function selectAllClasses() {
  selectedClasses.value = [...classIds.value];
  writeRoute();
}
function selectClass(classId) {
  selectedClasses.value = [classId];
  activeTab.value = 'classes';
  focusedItem.value = null;
  focusedStudent.value = '';
  focusedAbility.value = '';
  writeRoute();
}
function openAbility(dimension) {
  focusedAbility.value = dimension?.dimension?.key || dimension?.key || '';
  activeTab.value = 'ability';
  focusedItem.value = null;
  focusedStudent.value = '';
  writeRoute({ ability: focusedAbility.value });
}
function openItem(question) {
  focusedItem.value = question;
  focusedStudent.value = '';
  focusedAbility.value = '';
  activeTab.value = 'items';
  writeRoute({ item: String(question) });
}
function selectStudentLookup(value) {
  const candidate = studentCandidates.value.find((student) => student.id === value);
  if (candidate) selectStudent(candidate.id);
  else studentLookup.value = '';
}
function selectStudent(studentId) {
  focusedStudent.value = String(studentId || '');
  studentLookup.value = focusedStudent.value;
  focusedItem.value = null;
  focusedAbility.value = '';
  if (focusedStudent.value) writeRoute({ student: focusedStudent.value });
  else writeRoute();
}

onMounted(async () => {
  try {
    data.value = await loadSubject360();
    syncFromRoute();
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Subject 360 資料載入失敗';
  }
});
watch(() => route.query, syncFromRoute, { deep: true });
</script>

<template>
  <div class="subject360-page">
    <section v-if="!data && !error" class="subject360-loading subject360-card"><span class="subject360-spinner" />正在載入 Subject 360 資料…</section>
    <section v-else-if="error" class="subject360-card subject360-notice danger"><strong>Subject 360 載入失敗</strong><p>{{ error }}</p></section>
    <template v-else-if="subject">
      <section class="subject360-hero">
        <div><span class="subject360-kicker">SUBJECT 360 / TEACHER WORKSPACE</span><h1>{{ subject.label }}科教師教學決策工作臺</h1><p>先找問題，再確認能力與試題資料，最後落到學生與教學分組。</p></div>
        <div class="subject360-hero-controls">
          <label class="subject360-subject-select">目前科目<select :value="selectedSubjectId" @change="setSubject($event.target.value)"><option v-for="meta in SUBJECT360_META" :key="meta.id" :value="meta.id">{{ meta.label }}</option></select></label>
          <label class="subject360-subject-select subject360-student-search">查詢學生<input v-model="studentLookup" list="subject360-student-options" placeholder="輸入學生代碼…" :disabled="!studentCandidates.length" @change="selectStudentLookup(studentLookup)" @keydown.enter.prevent="selectStudentLookup(studentLookup)" /><datalist id="subject360-student-options"><option v-for="candidate in studentCandidates" :key="candidate.id" :value="candidate.id" :label="`${candidate.class}班 ${candidate.seat}號`" /></datalist></label>
        </div>
      </section>
      <SubjectScopePicker :class-ids="classIds" :selected-classes="selectedClasses" :scope-label="scopeLabel" @toggle-class="toggleClass" @select-all="selectAllClasses" />
      <nav class="subject360-tabs" aria-label="Subject 360 教學決策流程"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="setTab(tab.id)">{{ tab.label }}</button></nav>
      <component :is="activeComponent" v-bind="activeTab === 'ability' ? { initialDimension: focusedAbility } : {}" :subject="subject" :selected-classes="selectedClasses" :scope-label="scopeLabel" :focus-question="focusedItem" @open-page="setTab" @open-ability="openAbility" @open-item="openItem" @select-class="selectClass" @select-student="selectStudent" />
      <SubjectStudentDrawer :subject="subject" :selected-classes="selectedClasses" :initial-student-id="focusedStudent" :visible="Boolean(focusedStudent)" @close="selectStudent('')" @select-class="selectClass" @select-student="selectStudent" />
    </template>
  </div>
</template>
