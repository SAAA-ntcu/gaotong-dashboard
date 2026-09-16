<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Subject360Chart from '../components/Subject360Chart.vue';
import SubjectOverview from '../components/SubjectOverview.vue';
import SubjectClasses from '../components/SubjectClasses.vue';
import SubjectAbility from '../components/SubjectAbility.vue';
import SubjectItems from '../components/SubjectItems.vue';
import SubjectGroups from '../components/SubjectGroups.vue';
import SubjectStudents from '../components/SubjectStudents.vue';
import { SUBJECT360_META, formatPercent, getClassIds, getScopeLabel, loadSubject360 } from '../data/subject360';

const route = useRoute();
const router = useRouter();
const data = ref(null);
const error = ref('');
const activeTab = ref('overview');
const selectedSubjectId = ref('math');
const selectedClasses = ref([]);
const focusedItem = ref(null);
const focusedStudent = ref('');
const tabs = [
  { id: 'overview', label: '教學總覽' },
  { id: 'classes', label: '班級比較' },
  { id: 'ability', label: '能力分析' },
  { id: 'items', label: '試題分析' },
  { id: 'groups', label: '教學需求分組' },
  { id: 'students', label: '學生科目剖面' }
];
const subject = computed(() => data.value?.subjects?.[selectedSubjectId.value] || null);
const classIds = computed(() => getClassIds(subject.value));
const scopeLabel = computed(() => subject.value ? getScopeLabel(subject.value, selectedClasses.value) : '載入中');
const activeComponent = computed(() => ({ overview: SubjectOverview, classes: SubjectClasses, ability: SubjectAbility, items: SubjectItems, groups: SubjectGroups, students: SubjectStudents }[activeTab.value] || SubjectOverview));

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
}
function writeRoute(extra = {}) {
  const query = { ...route.query, subject: selectedSubjectId.value, tab: activeTab.value, ...extra };
  const ids = getClassIds(subject.value);
  if (selectedClasses.value.length === ids.length) delete query.class;
  else query.class = selectedClasses.value.join(',');
  router.replace({ name: 'subject', query });
}
function setTab(tab) {
  activeTab.value = tab;
  focusedItem.value = null;
  writeRoute();
}
function setSubject(subjectId) {
  selectedSubjectId.value = subjectId;
  selectedClasses.value = [...getClassIds(data.value.subjects[subjectId])];
  focusedItem.value = null;
  focusedStudent.value = '';
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
  writeRoute();
}
function openAbility(dimension) {
  activeTab.value = 'ability';
  focusedItem.value = null;
  writeRoute();
}
function openItem(question) {
  focusedItem.value = question;
  activeTab.value = 'items';
  writeRoute();
}
function selectStudent(studentId) {
  focusedStudent.value = studentId;
  activeTab.value = 'students';
  writeRoute();
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
        <div><span class="subject360-kicker">SUBJECT 360 / TEACHER WORKSPACE</span><h1>{{ subject.label }}科教師教學決策儀表板</h1><p>從科目、班級到題目、選項與學生的教學決策路徑。</p></div>
        <label class="subject360-subject-select">目前科目<select :value="selectedSubjectId" @change="setSubject($event.target.value)"><option v-for="meta in SUBJECT360_META" :key="meta.id" :value="meta.id">{{ meta.label }}</option></select></label>
      </section>
      <section class="subject360-context subject360-card">
        <div><span class="subject360-label">分析範圍</span><strong>{{ scopeLabel }}</strong></div>
        <button type="button" class="subject360-context-chip" :class="{ active: selectedClasses.length === classIds.length }" @click="selectAllClasses">全校 {{ classIds.length }} 班</button>
        <button v-for="classId in classIds" :key="classId" type="button" class="subject360-context-chip" :class="{ active: selectedClasses.includes(classId) }" @click="toggleClass(classId)">{{ classId }} 班</button>
      </section>
      <nav class="subject360-tabs" aria-label="Subject 360 模組"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="setTab(tab.id)">{{ tab.label }}</button></nav>
      <component :is="activeComponent" :subject="subject" :selected-classes="selectedClasses" :scope-label="scopeLabel" :focus-question="focusedItem" :initial-student-id="focusedStudent" @open-page="setTab" @open-ability="openAbility" @open-item="openItem" @select-class="selectClass" @select-student="selectStudent" />
    </template>
  </div>
</template>
