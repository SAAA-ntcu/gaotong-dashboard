<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ActionDrawer from '../components/ActionDrawer.vue';
import MetricCard from '../components/MetricCard.vue';
import NeedleGauge from '../components/NeedleGauge.vue';
import SupportTreemap from '../components/SupportTreemap.vue';
import {
  SUBJECTS,
  classIds,
  getActionPreset,
  getClassStats,
  getSchoolStats
} from '../data/dashboard';

const router = useRouter();
const school = getSchoolStats();
const selectedSubjectId = ref('math');
const selectedAction = ref(null);

const subjectCards = computed(() => SUBJECTS.map((subject) => school.subjects[subject.id]));
const selectedSubject = computed(() => school.subjects[selectedSubjectId.value]);
const classStats = computed(() => Object.fromEntries(classIds.map((classId) => [classId, getClassStats(classId)])));
const topSelectedClasses = computed(() => selectedSubject.value.classStats
  .slice()
  .sort((a, b) => b.supportCount - a.supportCount)
  .slice(0, 3));

const priorityItems = computed(() => [
  { key: '507', classId: '507', subjectId: 'math', title: '507 班・數學', reason: `${classStats.value['507'].subjects.math.supportCount} 人待加強，全校最高`, tone: 'danger' },
  { key: '503', classId: '503', subjectId: 'english', title: '503 班・跨科', reason: '三科同儕落差集中', tone: 'danger' },
  { key: '508', classId: '508', subjectId: 'english', title: '508 班・英語文', reason: '單科差距 -7.10 pp', tone: 'warning' }
]);

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatDelta(value) {
  return `${value > 0 ? '+' : value === 0 ? '±' : ''}${Number(value).toFixed(1)} pp`;
}

function chooseSubject(subjectId) {
  selectedSubjectId.value = subjectId;
  selectedAction.value = null;
}

function openAction(key) {
  selectedAction.value = getActionPreset(key);
}

function openClass(classId) {
  router.push({ name: 'class', query: { class: classId } });
}

function cellTone(stats) {
  if (stats.supportRate >= 25) return 'critical';
  if (stats.supportRate >= 12) return 'watch';
  return 'steady';
}

function schoolSubjectAction(subjectId) {
  if (subjectId === 'math') return 'math-all';
  if (subjectId === 'english') return '508';
  return '504';
}
</script>

<template>
  <div class="dashboard-view">
    <section class="page-intro">
      <div>
        <span class="section-kicker">SCHOOL DECISION COCKPIT</span>
        <h1>五年級學力檢測校務決策總覽</h1>
        <p>先定位問題科目，再沿著班級與學生資料進入 Class 工作臺。</p>
      </div>
      <div class="intro-meta">
        <span class="soft-chip">250 位在籍學生</span>
        <span class="soft-chip">9 個班級</span>
        <span class="soft-chip">國語文・數學・英語文</span>
        <RouterLink class="primary-button" :to="{ name: 'class', query: { class: '501' } }">開啟班級工作臺</RouterLink>
      </div>
    </section>

    <section class="metric-grid" aria-label="校務摘要">
      <MetricCard label="五年級在籍" :value="`${school.totalStudents} 人`" detail="501–509 班" icon="◎" />
      <MetricCard label="跨科成績完整度" :value="formatPercent(school.completenessRate)" detail="缺考／待補資料已標示" tone="success" icon="✓" />
      <MetricCard label="優先處理班級" :value="`${school.priorityClassCount} 班`" detail="至少一科待加強率偏高" tone="warning" icon="!" />
      <MetricCard label="跨科到考率" :value="formatPercent(school.testedRate)" detail="三科皆有有效成績" tone="blue" icon="↗" />
    </section>

    <section class="section-card subject-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">01 / SIGNAL</span>
          <h2>科目問題定位</h2>
        </div>
        <span class="section-help">指針只表達與縣市平均的差距；點擊科目查看班級分布。</span>
      </div>

      <div class="subject-card-grid">
        <button
          v-for="subject in subjectCards"
          :key="subject.id"
          type="button"
          class="subject-card"
          :class="{ selected: selectedSubjectId === subject.id }"
          @click="chooseSubject(subject.id)"
        >
          <div class="subject-card-head">
            <div>
              <span class="subject-mark" :style="{ background: subject.color }"></span>
              <strong>{{ subject.name }}</strong>
            </div>
            <span class="status-chip" :class="subject.delta < 0 ? 'danger' : subject.delta === 0 ? 'warning' : 'success'">
              {{ subject.delta < 0 ? '需要檢視' : subject.delta === 0 ? '基準線' : '整體領先' }}
            </span>
          </div>
          <NeedleGauge :value="subject.delta" :label="'與縣市差距'" :color="subject.color" />
          <div class="subject-card-stats">
            <span>全校平均 <strong>{{ subject.schoolAvg }}%</strong></span>
            <span>縣市平均 <strong>{{ subject.countyAvg }}%</strong></span>
            <span>待加強 <strong>{{ subject.supportCount }} 人</strong></span>
          </div>
          <p>{{ subject.note }}</p>
        </button>
      </div>

      <div class="distribution-layout">
        <div class="distribution-chart-panel">
          <div class="distribution-panel-head">
            <div>
              <span class="section-kicker">目前焦點：{{ selectedSubject.name }}</span>
              <h3>各班待加強分布 Treemap</h3>
            </div>
            <span class="section-help">面積代表待加強人數；點擊班級進入 Class，上方科目卡可切換檢視。</span>
          </div>
          <SupportTreemap
            :subjects="subjectCards"
            :class-ids="classIds"
            :class-stats="classStats"
            :selected-subject-id="selectedSubjectId"
            @select-class="openClass"
            @select-subject="chooseSubject"
          />
        </div>
        <aside class="distribution-detail">
          <span class="section-kicker">焦點科目摘要</span>
          <h3>{{ selectedSubject.name }}</h3>
          <div class="distribution-stat-grid">
            <div><span>待加強總數</span><strong>{{ selectedSubject.supportCount }} 人</strong><small>{{ formatPercent(selectedSubject.supportRate) }}</small></div>
            <div><span>全校相對差距</span><strong>{{ formatDelta(selectedSubject.delta) }}</strong><small>與縣市平均</small></div>
          </div>
          <div class="distribution-top-list">
            <span class="distribution-list-label">優先班級</span>
            <button v-for="item in topSelectedClasses" :key="item.classId" type="button" @click="openClass(item.classId)">
              <span><strong>{{ item.classId }} 班</strong><small>{{ formatPercent(item.supportRate) }}</small></span>
              <b>{{ item.supportCount }} 人 →</b>
            </button>
          </div>
          <button class="secondary-button" type="button" @click="openAction(schoolSubjectAction(selectedSubjectId))">開啟科目行動藍圖</button>
        </aside>
      </div>
    </section>

    <section class="decision-grid">
      <article class="section-card priority-card">
        <div class="section-heading compact">
          <div>
            <span class="section-kicker">02 / NEXT ACTION</span>
            <h2>優先行動佇列</h2>
          </div>
          <span class="section-help">點擊處方查看協作路徑</span>
        </div>
        <div class="priority-list">
          <button v-for="item in priorityItems" :key="item.key" type="button" class="priority-item" @click="openAction(item.key)">
            <span class="priority-rank">{{ priorityItems.indexOf(item) + 1 }}</span>
            <span class="priority-body">
              <strong>{{ item.title }}</strong>
              <small>{{ item.reason }}</small>
            </span>
            <span class="status-chip" :class="item.tone">查看</span>
          </button>
          <button type="button" class="priority-item subject-priority" @click="openAction('math-all')">
            <span class="priority-rank">↗</span>
            <span class="priority-body"><strong>五年級數學領域</strong><small>6 / 9 班待加強偏高，進入共同備課處方</small></span>
            <span class="status-chip danger">領域</span>
          </button>
        </div>
      </article>

      <article class="section-card methodology-card">
        <div class="section-heading compact">
          <div>
            <span class="section-kicker">03 / READING GUIDE</span>
            <h2>怎麼讀這個儀表板</h2>
          </div>
        </div>
        <div class="reading-steps">
          <div><span>1</span><p><strong>看指針</strong><br />先確認科目相對基準線的方向與幅度。</p></div>
          <div><span>2</span><p><strong>看熱力矩陣</strong><br />確認問題集中在哪些班級與科目。</p></div>
          <div><span>3</span><p><strong>開啟 Class</strong><br />進入學生名冊，從資料走向教學觀察。</p></div>
        </div>
      </article>
    </section>

    <section class="section-card matrix-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">04 / CLASS MATRIX</span>
          <h2>班級 × 科目待加強熱力矩陣</h2>
        </div>
        <span class="section-help">點擊任一列進入該班 Class；數字為待加強人數。</span>
      </div>
      <div class="table-wrap">
        <table class="data-table school-matrix">
          <thead>
            <tr><th>班級</th><th v-for="subject in SUBJECTS" :key="subject.id">{{ subject.name }}</th><th>跨科關注</th><th>到考率</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="classId in classIds" :key="classId" class="clickable-row" @click="openClass(classId)">
              <th>{{ classId }} 班</th>
              <td v-for="subject in SUBJECTS" :key="subject.id">
                <span class="heat-cell" :class="cellTone(classStats[classId].subjects[subject.id])">
                  {{ classStats[classId].subjects[subject.id].supportCount }} 人
                </span>
                <small>{{ formatPercent(classStats[classId].subjects[subject.id].supportRate) }}</small>
              </td>
              <td><span class="number-pill" :class="classStats[classId].multiSupportCount ? 'warning' : 'neutral'">{{ classStats[classId].multiSupportCount }} 人</span></td>
              <td><span class="completion-value" :class="classStats[classId].testedRate < 100 ? 'warning' : 'success'">{{ formatPercent(classStats[classId].testedRate) }}</span></td>
              <td><span class="row-arrow">→</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="legend-row"><span><i class="legend-dot steady"></i>常態</span><span><i class="legend-dot watch"></i>需要關注</span><span><i class="legend-dot critical"></i>優先檢視</span><span class="legend-note">本矩陣不代表學生排名，僅供教學支持分流。</span></div>
    </section>

    <ActionDrawer :action="selectedAction" @close="selectedAction = null" />
  </div>
</template>
