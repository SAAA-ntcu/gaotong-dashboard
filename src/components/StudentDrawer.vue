<script setup>
import { computed } from 'vue';

const props = defineProps({
  student: { type: Object, default: null },
  classId: { type: String, default: '' }
});
const emit = defineEmits(['close']);

const subjectDetails = computed(() => {
  if (!props.student) return [];
  if (Array.isArray(props.student.subjectDetails)) return props.student.subjectDetails;
  return Object.values(props.student.subjects || {}).map((record) => ({
    subject: record.subject,
    displayText: record.officialLevel || record.status,
    officialLevel: record.officialLevel,
    studentAccuracy: record.studentAccuracy,
    countyPr: record.countyPr
  }));
});

const checklist = computed(() => props.student?.objectiveChecklist || []);
const attendanceStatus = computed(() => {
  const records = Object.values(props.student?.subjects || {});
  return records.length === 3 && records.every((record) => record?.status === 'VALID')
    ? '全數到考'
    : '有缺考／缺資料';
});
</script>

<template>
  <aside v-if="student" class="student-drawer" aria-label="學生資料詳情">
    <div class="drawer-head">
      <div>
        <span class="section-kicker">{{ classId }} 班・教師觀察卡</span>
        <h2>座號 {{ student.seat }} 號</h2>
      </div>
      <button class="icon-button" type="button" aria-label="關閉學生詳情" @click="emit('close')">×</button>
    </div>

    <div class="student-state-grid">
      <div><span>關注廣度</span><strong>{{ student.supportBreadth?.breadth ?? '-' }} 科</strong></div>
      <div><span>到考狀況</span><strong>{{ attendanceStatus }}</strong></div>
      <div><span>跨科表現</span><strong>{{ student.crossSubjectInconsistency?.isInconsistent ? '高度不一致' : '未見明顯訊號' }}</strong></div>
    </div>

    <section class="drawer-section">
      <span class="section-kicker">科目資料</span>
      <div class="student-subject-list">
        <div v-for="item in subjectDetails" :key="item.subject" class="student-subject-row">
          <strong>{{ item.subject }}</strong>
          <span class="status-chip" :class="item.officialLevel === '待加強' ? 'danger' : item.officialLevel === '精熟' ? 'success' : 'neutral'">{{ item.displayText || item.officialLevel || '無資料' }}</span>
          <small v-if="item.studentAccuracy !== null && item.studentAccuracy !== undefined">答對率 {{ item.studentAccuracy }}%・PR {{ item.countyPr ?? '-' }}</small>
        </div>
      </div>
    </section>

    <section v-if="student.consultPartners?.length" class="drawer-section">
      <span class="section-kicker">協作對象</span>
      <p>{{ student.consultPartners.join('、') }} 任課教師</p>
    </section>

    <section v-if="checklist.length" class="drawer-section">
      <span class="section-kicker">客觀觀察清單</span>
      <div v-for="item in checklist" :key="item.id" class="checklist-item">
        <strong>{{ item.title }}</strong>
        <p>{{ item.description }}</p>
      </div>
    </section>

    <p v-if="student.disclaimer" class="ethics-note">{{ student.disclaimer }}</p>
  </aside>
</template>
