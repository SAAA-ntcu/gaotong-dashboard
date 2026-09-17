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
import { getAccessProfile, getAllowedClassIds } from '../data/access';

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
const accessProfile = computed(() => getAccessProfile(route.query.role));
const accessibleSubjectMeta = computed(() => SUBJECT360_META.filter((meta) => accessProfile.value.subjectIds.includes(meta.id)));
const subject = computed(() => data.value?.subjects?.[selectedSubjectId.value] || null);
const classIds = computed(() => getAllowedClassIds(accessProfile.value, subject.value));
const scopeLabel = computed(() => {
  if (!subject.value) return '載入中';
  const fullClassIds = getClassIds(subject.value);
  if (classIds.value.length < fullClassIds.length && selectedClasses.value.length === classIds.value.length) {
    return `${accessProfile.value.label}｜${selectedClasses.value.join('、')}班`;
  }
  return getScopeLabel(subject.value, selectedClasses.value);
});
const selectAllLabel = computed(() => classIds.value.length === getClassIds(subject.value).length ? '全校' : '可見範圍');
const studentCandidates = computed(() => subject.value ? getClassStudents(subject.value, selectedClasses.value) : []);
const activeComponent = computed(() => ({ overview: SubjectOverview, classes: SubjectClasses, ability: SubjectAbility, items: SubjectItems, groups: SubjectGroups }[activeTab.value] || SubjectOverview));

function validTab(value) {
  return tabs.some((tab) => tab.id === value) ? value : 'overview';
}
function validSubject(value) {
  return accessibleSubjectMeta.value.some((meta) => meta.id === value) ? value : accessibleSubjectMeta.value[0]?.id || 'math';
}
function parseClasses(value, ids) {
  const requested = String(value || '').split(',').filter((id) => ids.includes(id));
  return requested.length ? requested : [...ids];
}
function syncFromRoute() {
  if (!data.value) return;
  selectedSubjectId.value = validSubject(route.query.subject);
  activeTab.value = validTab(route.query.tab);
  const scopedSubject = data.value.subjects[selectedSubjectId.value];
  selectedClasses.value = parseClasses(route.query.class, getAllowedClassIds(accessProfile.value, scopedSubject));
  const question = Number(route.query.item);
  focusedItem.value = Number.isInteger(question) && question > 0 ? question : null;
  focusedAbility.value = String(route.query.ability || '');
  focusedStudent.value = String(route.query.student || '');
  studentLookup.value = focusedStudent.value;
}
function writeRoute(extra = {}) {
  const query = { ...route.query, role: accessProfile.value.id, subject: selectedSubjectId.value, tab: activeTab.value, ...extra };
  const ids = classIds.value;
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
  if (!accessibleSubjectMeta.value.some((meta) => meta.id === subjectId)) return;
  selectedSubjectId.value = subjectId;
  selectedClasses.value = getAllowedClassIds(accessProfile.value, data.value.subjects[subjectId]);
  focusedItem.value = null;
  focusedStudent.value = '';
  focusedAbility.value = '';
  writeRoute();
}
function toggleClass(classId) {
  if (!classIds.value.includes(classId)) return;
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
  if (!classIds.value.includes(classId)) return;
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
  const candidate = studentCandidates.value.find((student) => student.id === studentId);
  if (!candidate) {
    focusedStudent.value = '';
    studentLookup.value = '';
    writeRoute();
    return;
  }
  focusedStudent.value = String(candidate.id);
  studentLookup.value = focusedStudent.value;
  focusedItem.value = null;
  focusedAbility.value = '';
  writeRoute({ student: focusedStudent.value });
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
          <label class="subject360-subject-select">目前科目<select :value="selectedSubjectId" @change="setSubject($event.target.value)"><option v-for="meta in accessibleSubjectMeta" :key="meta.id" :value="meta.id">{{ meta.label }}</option></select></label>
          <label class="subject360-subject-select subject360-student-search">查詢學生<input v-model="studentLookup" list="subject360-student-options" placeholder="輸入學生代碼…" :disabled="!studentCandidates.length" @change="selectStudentLookup(studentLookup)" @keydown.enter.prevent="selectStudentLookup(studentLookup)" /><datalist id="subject360-student-options"><option v-for="candidate in studentCandidates" :key="candidate.id" :value="candidate.id" :label="`${candidate.class}班 ${candidate.seat}號`" /></datalist></label>
        </div>
      </section>
      <div class="subject360-access-banner">
        <div><span>目前權限視角</span><strong>{{ accessProfile.label }}</strong></div>
        <p>{{ accessProfile.scopeLabel }}。頁面只呈現目前視角可存取的科目、班級與學生證據。</p>
      </div>
      <SubjectScopePicker :class-ids="classIds" :selected-classes="selectedClasses" :scope-label="scopeLabel" :select-all-label="selectAllLabel" @toggle-class="toggleClass" @select-all="selectAllClasses" />
      <nav class="subject360-tabs" aria-label="Subject 360 教學決策流程"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="setTab(tab.id)">{{ tab.label }}</button></nav>
      <component
        :is="activeComponent"
        v-bind="activeTab === 'ability' ? { initialDimension: focusedAbility } : {}"
        :subject="subject"
        :selected-classes="selectedClasses"
        :visible-class-ids="classIds"
        :scope-label="scopeLabel"
        :focus-question="focusedItem"
        @open-page="setTab"
        @open-ability="openAbility"
        @open-item="openItem"
        @select-class="selectClass"
        @select-student="selectStudent"
      />
      <SubjectStudentDrawer :subject="subject" :selected-classes="selectedClasses" :visible-class-ids="classIds" :initial-student-id="focusedStudent" :visible="Boolean(focusedStudent)" @close="selectStudent('')" @select-class="selectClass" @select-student="selectStudent" />
    </template>
  </div>
</template>
