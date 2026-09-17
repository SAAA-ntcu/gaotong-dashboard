<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MetricCard from '../components/MetricCard.vue';
import NeedleGauge from '../components/NeedleGauge.vue';
import StudentDrawer from '../components/StudentDrawer.vue';
import {
  SUBJECTS,
  classIds as allClassIds,
  getClassData,
  getClassStats,
  getRows,
  getStudentDrawer,
  getSubject
} from '../data/dashboard';
import { getAccessProfile } from '../data/access';

const route = useRoute();
const router = useRouter();
const accessProfile = computed(() => getAccessProfile(route.query.role));
const visibleClassIds = computed(() => allClassIds.filter((classId) => accessProfile.value.classIds.includes(classId)));
const visibleSubjects = computed(() => SUBJECTS.filter((subject) => accessProfile.value.subjectIds.includes(subject.id)));
const activeClassId = ref(resolveClassId(route.query.class, visibleClassIds.value));
const selectedSubjectId = ref(accessProfile.value.subjectIds[0] || 'math');
const currentFilter = ref('all');
const selectedSeat = ref(null);

function resolveClassId(value, availableClassIds = allClassIds) {
  const normalized = String(value || '');
  return availableClassIds.includes(normalized) ? normalized : availableClassIds[0];
}

watch(() => [route.query.class, route.query.role], () => {
  activeClassId.value = resolveClassId(route.query.class, visibleClassIds.value);
  if (!accessProfile.value.subjectIds.includes(selectedSubjectId.value)) selectedSubjectId.value = accessProfile.value.subjectIds[0] || 'math';
  selectedSeat.value = null;
});

const classData = computed(() => getClassData(activeClassId.value));
const stats = computed(() => getClassStats(activeClassId.value));
const rows = computed(() => getRows(activeClassId.value));
const selectedSubject = computed(() => getSubject(selectedSubjectId.value));
const selectedSubjectStats = computed(() => stats.value.subjects[selectedSubjectId.value]);
const selectedStudent = computed(() => selectedSeat.value ? getStudentDrawer(activeClassId.value, selectedSeat.value) : null);

const filterOptions = [
  { id: 'all', label: '全部學生' },
  { id: 'no_signal', label: '未見關注訊號' },
  { id: 'single_subject', label: '單科關注' },
  { id: 'multi_subject', label: '多科共同' },
  { id: 'inconsistent', label: '跨科不一致' },
  { id: 'incomplete', label: '有缺考／缺資料' }
];

const filterCounts = computed(() => Object.fromEntries(filterOptions.map((filter) => [
  filter.id,
  filter.id === 'all' ? rows.value.length : rows.value.filter((row) => row.filterTags?.includes(filter.id)).length
])));

const filteredRows = computed(() => rows.value.filter((row) => currentFilter.value === 'all' || row.filterTags?.includes(currentFilter.value)));
const breadthSegments = computed(() => [
  { id: 0, label: '0 科', value: stats.value.breadthCounts[0], tone: 'success' },
  { id: 1, label: '1 科', value: stats.value.breadthCounts[1], tone: 'warning' },
  { id: 2, label: '2 科', value: stats.value.breadthCounts[2], tone: 'danger' },
  { id: 3, label: '3 科', value: stats.value.breadthCounts[3], tone: 'critical' }
]);

function setClass(classId) {
  if (!visibleClassIds.value.includes(classId)) return;
  router.replace({ name: 'class', query: { role: accessProfile.value.id, class: classId } });
  currentFilter.value = 'all';
  selectedSeat.value = null;
}

function setFilter(filterId) {
  currentFilter.value = filterId;
  selectedSeat.value = null;
}

function focusStudent(row) {
  selectedSeat.value = row.seat;
}

function subjectRecord(row, subject) {
  return row.subjects?.[subject.name];
}

function isFullyTested(row) {
  return visibleSubjects.value.every((subject) => subjectRecord(row, subject)?.status === 'VALID');
}

function levelClass(record) {
  if (!record || record.status === 'ABSENT' || record.status === 'MISSING') return 'missing';
  if (record.officialLevel === '待加強') return 'support';
  if (record.officialLevel === '精熟') return 'advanced';
  return 'basic';
}

function levelLabel(record) {
  if (!record || record.status === 'ABSENT' || record.status === 'MISSING') return '缺考 / 無資料';
  return record.officialLevel || record.status;
}

function formatDelta(value) {
  return `${value > 0 ? '+' : value === 0 ? '±' : ''}${Number(value).toFixed(2)} pp`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}
</script>

<template>
  <div class="dashboard-view class-view">
    <section class="class-topbar">
      <div>
        <span class="section-kicker">班級資料</span>
        <h1>班級學力資料</h1>
        <p>目前班級包含 {{ visibleSubjects.length }} 個科目，顯示可查看的學生資料。{{ accessProfile.scopeLabel }}</p>
      </div>
      <RouterLink v-if="accessProfile.canViewSchool" class="secondary-button" :to="{ name: 'school', query: { role: accessProfile.id } }">返回校務總覽</RouterLink>
    </section>

    <div class="class-tabs" role="tablist" aria-label="切換班級">
      <button v-for="classId in visibleClassIds" :key="classId" type="button" class="class-tab" :class="{ active: activeClassId === classId }" @click="setClass(classId)">
        {{ classId }} 班
      </button>
    </div>

    <section class="class-identity section-card">
      <div>
        <span class="section-kicker">目前班級</span>
        <h2>{{ activeClassId }} 班・跨科資料</h2>
        <p>五年級・在籍 {{ stats.totalStudents }} 人・評量科目 {{ visibleSubjects.map((subject) => subject.name).join('、') }}</p>
      </div>
      <span class="status-chip" :class="stats.testedRate >= 100 ? 'success' : 'warning'">
        {{ stats.testedRate >= 100 ? '全數到考' : `到考率 ${formatPercent(stats.testedRate)}` }}
      </span>
    </section>

    <section class="metric-grid class-metrics">
      <MetricCard label="在籍學生" :value="`${stats.totalStudents} 人`" detail="依座號順序" icon="◎" />
      <MetricCard label="到考率" :value="formatPercent(stats.testedRate)" detail="三科皆有有效成績" :tone="stats.testedRate >= 100 ? 'success' : 'warning'" icon="✓" />
      <MetricCard label="多科共同關注" :value="`${stats.multiSupportCount} 人`" detail="2 科以上" tone="danger" icon="×" />
      <MetricCard label="跨科不一致" :value="`${stats.inconsistentCount} 人`" detail="獨立指標" tone="warning" icon="≈" />
    </section>

    <section class="class-focus-layout">
      <article class="section-card class-focus-card">
        <div class="section-heading compact">
          <div>
            <span class="section-kicker">01 / 科目表現</span>
            <h2>{{ selectedSubject.name }}・班級同儕差距</h2>
          </div>
          <div class="subject-switcher">
            <button v-for="subject in visibleSubjects" :key="subject.id" type="button" :class="{ active: selectedSubjectId === subject.id }" @click="selectedSubjectId = subject.id">
              {{ subject.shortName }}
            </button>
          </div>
        </div>
        <div class="class-focus-content">
          <NeedleGauge :value="selectedSubjectStats.delta" :label="'與學年同儕差距'" :color="selectedSubject.color" :height="250" />
          <div class="focus-facts">
            <div><span>待加強人數</span><strong>{{ selectedSubjectStats.supportCount }} / {{ selectedSubjectStats.tested }}</strong><small>{{ formatPercent(selectedSubjectStats.supportRate) }}</small></div>
            <div><span>班級平均答對率</span><strong>{{ selectedSubjectStats.avgAccuracy?.toFixed(1) || '-' }}%</strong><small>有效資料平均</small></div>
            <div><span>解讀</span><strong>{{ selectedSubjectStats.delta < -4 ? '優先檢視' : selectedSubjectStats.delta > 2 ? '高於學年平均' : '常態追蹤' }}</strong><small>{{ formatDelta(selectedSubjectStats.delta) }}</small></div>
          </div>
        </div>
      </article>

      <article class="section-card breadth-card">
        <div class="section-heading compact">
          <div>
            <span class="section-kicker">02 / 關注範圍</span>
            <h2>班級支持結構</h2>
          </div>
          <span class="section-help">點擊分流列即可篩選學生</span>
        </div>
        <div class="breadth-list">
          <button v-for="segment in breadthSegments" :key="segment.id" type="button" class="breadth-row" @click="setFilter(segment.id === 0 ? 'no_signal' : segment.id === 1 ? 'single_subject' : 'multi_subject')">
            <span class="breadth-label"><i class="legend-dot" :class="segment.tone"></i>{{ segment.label }}</span>
            <span class="breadth-track"><span :class="`fill-${segment.tone}`" :style="{ width: `${stats.totalStudents ? segment.value / stats.totalStudents * 100 : 0}%` }"></span></span>
            <strong>{{ segment.value }}</strong>
          </button>
        </div>
        <div class="breadth-note">關注廣度、跨科表現不一致、到考狀況是三個獨立維度，彼此不互相取代。</div>
      </article>
    </section>

    <section class="section-card matrix-section class-matrix-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">03 / 學生與科目</span>
          <h2>學生跨科資料</h2>
        </div>
        <span class="section-help">點擊學生列開啟教師觀察卡；狀態欄只使用等級描述。</span>
      </div>
      <div class="filter-row">
        <button v-for="filter in filterOptions" :key="filter.id" type="button" class="filter-button" :class="{ active: currentFilter === filter.id }" @click="setFilter(filter.id)">
          {{ filter.label }} <b>{{ filterCounts[filter.id] }}</b>
        </button>
      </div>
      <div class="table-wrap">
        <table class="data-table student-table">
          <thead>
            <tr><th>座號</th><th v-for="subject in visibleSubjects" :key="subject.id">{{ subject.name }}</th><th>關注廣度</th><th>跨科表現</th><th>到考狀況</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.studentUid" class="clickable-row" :class="{ focused: selectedSeat === row.seat }" @click="focusStudent(row)">
              <th>{{ row.seat }}</th>
              <td v-for="subject in visibleSubjects" :key="subject.id">
                <span class="level-badge" :class="levelClass(subjectRecord(row, subject))">{{ levelLabel(subjectRecord(row, subject)) }}</span>
                <small v-if="subjectRecord(row, subject)?.studentAccuracy !== null && subjectRecord(row, subject)?.studentAccuracy !== undefined">{{ subjectRecord(row, subject).studentAccuracy }}%・PR{{ Math.round(subjectRecord(row, subject).countyPr ?? 0) }}</small>
              </td>
              <td><span class="number-pill" :class="row.supportBreadth?.breadth >= 2 ? 'danger' : row.supportBreadth?.breadth === 1 ? 'warning' : 'success'">{{ row.supportBreadth?.breadth ?? 0 }} 科</span></td>
              <td><span class="status-chip" :class="row.crossSubjectInconsistency?.isInconsistent ? 'warning' : 'neutral'">{{ row.crossSubjectInconsistency?.isInconsistent ? '高度不一致' : '—' }}</span></td>
              <td><span class="status-chip" :class="isFullyTested(row) ? 'success' : 'warning'">{{ isFullyTested(row) ? '全數到考' : '有缺考／缺資料' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="legend-row"><span><i class="legend-dot advanced"></i>精熟</span><span><i class="legend-dot basic"></i>基礎</span><span><i class="legend-dot critical"></i>待加強</span><span><i class="legend-dot missing"></i>缺考／無資料</span></div>
    </section>

    <StudentDrawer :student="selectedStudent" :class-id="activeClassId" @close="selectedSeat = null" />
  </div>
</template>
