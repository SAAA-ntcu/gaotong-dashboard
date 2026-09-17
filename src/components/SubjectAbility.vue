<script setup>
import { computed, ref, watch } from 'vue';
import SubjectItemDialog from './SubjectItemDialog.vue';
import {
  formatCount,
  formatPercent,
  formatPoints,
  getClassIds,
  getHistoricalDimensionDiagnosis,
  getLinkedDimensions,
  itemPriority,
  linkedDimensionPriority
} from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  visibleClassIds: { type: Array, default: () => [] },
  scopeLabel: { type: String, default: '' },
  initialDimension: { type: String, default: '' }
});

const emit = defineEmits(['select-class', 'select-student']);
const selectedKey = ref(props.initialDimension);
const focusedQuestion = ref(null);
const dimensions = computed(() => getLinkedDimensions(props.subject));
const hasCognitive = computed(() => Boolean(props.subject.dimensions?.cognitive?.length));
const classScope = computed(() => props.visibleClassIds.length ? props.visibleClassIds : getClassIds(props.subject));
const comparisonLabel = computed(() => classScope.value.length === getClassIds(props.subject).length ? '全校' : '可見範圍');
const activeDimension = computed(() => dimensions.value.find((dimension) => dimension.key === selectedKey.value) || dimensions.value[0]);
const selectedPriority = computed(() => activeDimension.value ? linkedDimensionPriority(props.subject, activeDimension.value, props.selectedClasses, classScope.value) : null);
const questionRows = computed(() => activeDimension.value ? activeDimension.value.items.map((question) => itemPriority(props.subject, question, props.selectedClasses, classScope.value)) : []);
const historicalDiagnosis = computed(() => activeDimension.value ? getHistoricalDimensionDiagnosis(props.subject, activeDimension.value, props.selectedClasses) : null);
const historyDimension = computed(() => historicalDiagnosis.value?.historyDimension);
const historyActions = computed(() => historyDimension.value?.actions || []);
const historyYears = computed(() => props.subject.historicalAnalysis?.historicalYears || []);

watch(() => [props.subject.key, props.initialDimension], () => {
  selectedKey.value = props.initialDimension;
  focusedQuestion.value = null;
}, { immediate: true });

function chooseDimension(dimension) {
  selectedKey.value = dimension.key;
  focusedQuestion.value = null;
}
function closeQuestion() {
  focusedQuestion.value = null;
}
function selectClass(classId) {
  closeQuestion();
  emit('select-class', classId);
}
function selectStudent(studentId) {
  closeQuestion();
  emit('select-student', studentId);
}
function optionLabel(option) {
  return ['A', 'B', 'C', 'D'][Number(option) - 1] || '—';
}
function priorityClass(level) {
  if (level === '高優先' || level === '極高風險') return 'high';
  if (level === '中優先' || level === '高風險') return 'medium';
  return 'observe';
}
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head">
      <div><h2>能力診斷</h2><p>{{ hasCognitive ? '每張卡都是內容向度 × 認知向度的聯結，避免把數學能力拆成兩張互不相干的表。' : '依內容向度下鑽到題目與學生資料。' }}</p></div>
      <span class="subject360-badge">{{ hasCognitive ? '內容 × 認知' : '內容向度' }}</span>
    </div>

    <div class="subject360-dimension-grid">
      <button v-for="dimension in dimensions" :key="dimension.key" type="button" class="subject360-dimension-card" :class="{ active: activeDimension?.key === dimension.key }" @click="chooseDimension(dimension)">
        <div><strong>{{ dimension.label || dimension.key }}</strong><b>{{ formatPercent(linkedDimensionPriority(subject, dimension, selectedClasses, classScope).selected?.rate) }}</b></div>
        <p>{{ dimension.description }}</p><small>{{ dimension.items.length }} 題・{{ formatPoints(linkedDimensionPriority(subject, dimension, selectedClasses, classScope).gap) }} vs {{ comparisonLabel }}</small>
      </button>
    </div>

    <section v-if="historicalDiagnosis" class="subject360-card subject360-section-gap subject360-history-inference">
      <div class="subject360-card-head">
        <div><h3>能力診斷 × 歷年知識庫</h3><span>{{ historicalDiagnosis.label }}｜對照 {{ historyYears.join('、') }} 年官方報告</span></div>
        <span class="subject360-priority" :class="historicalDiagnosis.hasCurrentSignal ? 'medium' : 'observe'">{{ historicalDiagnosis.evidenceLabel }}</span>
      </div>
      <div class="subject360-notice info">本次題目表現只用來啟動歷史知識庫的教學鏡像；以下是「可能的錯誤假設」候選，不是由歷史資料直接確診的學生迷思，仍須回到題目選項、口頭解釋或學生作品確認。</div>
      <div class="subject360-mini-grid subject360-history-inference-kpis">
        <div><span>目前向度</span><strong>{{ formatPercent(historicalDiagnosis.currentRate, 1) }}</strong><small>{{ scopeLabel }}｜有效作答 {{ formatCount(historicalDiagnosis.currentValid) }}</small></div>
        <div><span>歷年向度平均</span><strong>{{ formatPercent(historyDimension?.historyAverage, 1) }}</strong><small>{{ historyDimension?.recurrenceYears?.length || 0 }} 年曾出現同向度訊號</small></div>
        <div><span>本次支持題目</span><strong>{{ historicalDiagnosis.signalItems.length }}</strong><small>題目答對率低於 70%</small></div>
        <div><span>知識庫狀態</span><strong>{{ historyDimension ? '已對照' : '無對應' }}</strong><small>{{ historyDimension ? '保留報告來源' : '只顯示本次作答資料' }}</small></div>
      </div>
      <div class="subject360-history-inference-grid">
        <div>
          <b>候選迷思概念</b>
          <ul v-if="historicalDiagnosis.misconceptions.length"><li v-for="misconception in historicalDiagnosis.misconceptions" :key="misconception">{{ misconception }}</li></ul>
          <p v-else class="subject360-empty">本次沒有低於 70% 的題目；目前只保留歷史提醒，不把它當成本次迷思。</p>
        </div>
        <div>
          <b>歷史知識庫盲點</b>
          <p>{{ historyDimension?.blindSpot || '目前沒有對應的歷年向度說明。' }}</p>
          <p>{{ historyDimension?.historicalMirror || '目前沒有可用的歷年鏡像敘述。' }}</p>
        </div>
      </div>
      <div v-if="historicalDiagnosis.signalItems.length" class="subject360-history-inference-evidence">
        <b>啟動推論的本次題目</b>
        <div class="subject360-tag-list">
          <button v-for="item in historicalDiagnosis.signalItems.slice(0, 6)" :key="item.q" type="button" class="subject360-tag emphasis" @click="focusedQuestion = item.q">
            Q{{ item.q }}・{{ item.label }}<small>{{ formatPercent(item.currentRate, 1) }}<span v-if="item.currentTopWrong">｜主要錯誤 {{ optionLabel(item.currentTopWrong.option) }}</span></small>
          </button>
        </div>
      </div>
      <div v-if="historyActions.length" class="subject360-history-actions">
        <div v-for="action in historyActions.slice(0, 3)" :key="action.title"><strong>{{ action.title }}</strong><p>{{ action.action }}</p><small>檢核：{{ action.check }}</small></div>
      </div>
      <details class="subject360-history-item-details">
        <summary>查看引導提問與報告來源</summary>
        <ul class="subject360-prompt-list"><li v-for="prompt in historyDimension?.prompts || []" :key="prompt">{{ prompt }}</li></ul>
        <ul class="subject360-source-list"><li v-for="source in historicalDiagnosis.sources" :key="`${source.year}-${source.file}-${source.section}`">{{ source.year }}｜{{ source.file }}｜{{ source.section }}</li></ul>
      </details>
    </section>

    <article v-if="activeDimension && selectedPriority" class="subject360-card subject360-section-gap">
      <div class="subject360-card-head"><h3>{{ activeDimension.label || activeDimension.key }}｜題目資料</h3><span>{{ activeDimension.items.length }} 題・{{ activeDimension.description }}</span></div>
      <div class="subject360-table-wrap">
        <table class="subject360-table"><thead><tr><th>題目</th><th>{{ comparisonLabel }}</th><th>所選範圍</th><th>差距</th><th>主要錯誤</th><th>優先</th></tr></thead><tbody>
          <tr v-for="row in questionRows" :key="row.item.q" class="clickable-row" @click="focusedQuestion = row.item.q"><td>Q{{ row.item.q }} {{ row.item.short }}</td><td>{{ formatPercent(row.school.rate) }}<small>N={{ formatCount(row.school.valid) }}</small></td><td>{{ formatPercent(row.selected.rate) }}<small>N={{ formatCount(row.selected.valid) }}</small></td><td>{{ formatPoints(row.delta) }}</td><td>{{ row.selected.topWrong ? optionLabel(row.selected.topWrong.option) : '—' }}</td><td><span class="subject360-priority" :class="row.level === '高優先' ? 'high' : row.level === '中優先' ? 'medium' : 'observe'">{{ row.level }}</span></td></tr>
        </tbody></table>
      </div>
      <div class="subject360-signal-list"><div><b>向度判斷</b><p><span class="subject360-priority" :class="selectedPriority.level === '高優先' ? 'high' : selectedPriority.level === '中優先' ? 'medium' : 'observe'">{{ selectedPriority.level }}</span> {{ selectedPriority.reasons.join('；') || '目前沒有明顯差距' }}</p></div><div><b>資料解讀</b><p>歷年知識庫只提供候選盲點與教學檢核；能力診斷仍要回到題目選項與學生資料確認。</p></div></div>
    </article>
    <SubjectItemDialog :subject="subject" :question="focusedQuestion" :selected-classes="selectedClasses" :visible-class-ids="visibleClassIds" :visible="Boolean(focusedQuestion)" @close="closeQuestion" @select-class="selectClass" @select-student="selectStudent" />
  </div>
</template>
