<script setup>
import { computed } from 'vue';
import { formatCount, formatPercent, getClassOverall, getItemStat, getClassIds, getSubjectMeta } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  question: { type: Number, default: null },
  selectedClasses: { type: Array, required: true },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'select-class', 'select-student']);

const item = computed(() => props.question ? props.subject.items[props.question - 1] : null);
const selectedStat = computed(() => item.value ? getItemStat(props.subject, props.question, props.selectedClasses) : null);
const schoolStat = computed(() => item.value ? getItemStat(props.subject, props.question, getClassIds(props.subject)) : null);
const classRows = computed(() => item.value ? getClassIds(props.subject).map((classId) => ({
  classId,
  stat: getItemStat(props.subject, props.question, [classId]),
  overall: getClassOverall(props.subject, classId)
})).sort((a, b) => (a.stat.rate ?? 1) - (b.stat.rate ?? 1)) : []);
const affectedStudents = computed(() => {
  if (!item.value) return [];
  const scope = new Set(props.selectedClasses);
  return (props.subject.students || [])
    .filter((student) => scope.has(student.class))
    .filter((student) => {
      const response = student.responses[props.question - 1];
      return response == null || response !== item.value.answer;
    })
    .slice(0, 12);
});
const optionLabels = ['A', 'B', 'C', 'D', '其他／未答'];
const optionRows = computed(() => optionLabels.map((label, index) => ({
  label,
  rate: selectedStat.value?.optionRates?.[index] || 0,
  correct: index + 1 === item.value?.answer
})));
const meta = computed(() => getSubjectMeta(props.subject.key));
const historicalInsight = computed(() => item.value ? props.subject.historicalAnalysis?.itemInsights?.[String(item.value.q)] || null : null);
</script>

<template>
  <div v-if="visible && item" class="subject360-modal" role="dialog" aria-modal="true" :aria-label="`Q${item.q} 題目診斷`">
    <button class="subject360-modal-backdrop" type="button" aria-label="關閉題目診斷" @click="emit('close')" />
    <section class="subject360-modal-panel">
      <header class="subject360-modal-head">
        <div>
          <span class="subject360-kicker" :style="{ color: meta.color }">ITEM DIAGNOSTIC</span>
          <h2>Q{{ item.q }}・{{ item.short }}</h2>
          <p>{{ item.content }}<span v-if="item.cognitive"> × {{ item.cognitive }}</span></p>
        </div>
        <button class="icon-button" type="button" aria-label="關閉題目診斷" @click="emit('close')">×</button>
      </header>
      <div class="subject360-modal-body">
        <div class="subject360-mini-grid">
          <div><span>正確答案</span><strong>{{ ['A', 'B', 'C', 'D'][item.answer - 1] || item.answer }}</strong></div>
          <div><span>目前範圍</span><strong>{{ formatPercent(selectedStat?.rate) }}</strong><small>N={{ formatCount(selectedStat?.valid) }}</small></div>
          <div><span>全校</span><strong>{{ formatPercent(schoolStat?.rate) }}</strong><small>N={{ formatCount(schoolStat?.valid) }}</small></div>
          <div><span>主要錯誤</span><strong>{{ selectedStat?.topWrong ? ['A', 'B', 'C', 'D'][selectedStat.topWrong.option - 1] : '—' }}</strong><small>{{ selectedStat?.topWrong ? formatPercent(selectedStat.topWrong.share) + ' of wrong' : '無明顯集中' }}</small></div>
        </div>
        <div class="subject360-modal-grid">
          <article class="subject360-card">
            <div class="subject360-card-head"><h3>選項分布</h3><span>正確答案以深色標示</span></div>
            <div class="subject360-option-list">
              <div v-for="row in optionRows" :key="row.label" class="subject360-option-row"><span :class="{ correct: row.correct }">{{ row.label }}<small v-if="row.correct">正確</small></span><i><em :style="{ width: `${Math.max(1, row.rate * 100)}%` }" :class="{ correct: row.correct }" /></i><strong>{{ formatPercent(row.rate) }}</strong></div>
            </div>
          </article>
          <article class="subject360-card">
            <div class="subject360-card-head"><h3>班級答對率</h3><span>低到高排序</span></div>
            <div class="subject360-class-list">
              <div v-for="row in classRows" :key="row.classId" class="subject360-class-row">
                <span><button type="button" class="subject360-link-button" @click="emit('select-class', row.classId)">{{ row.classId }} 班</button></span><div><i :style="{ width: `${Math.max(1, (row.stat.rate || 0) * 100)}%` }" :class="{ low: row.stat.rate < 0.6 }" /></div><strong>{{ formatPercent(row.stat.rate) }}</strong>
              </div>
            </div>
          </article>
        </div>
        <article v-if="historicalInsight" class="subject360-card subject360-history-item-card">
          <div class="subject360-card-head"><div><h3>115 弱點判讀 × 歷年報告</h3><span>{{ historicalInsight.dimension }}</span></div><span class="subject360-priority" :class="historicalInsight.level === '極高風險' || historicalInsight.level === '高風險' ? 'high' : historicalInsight.level === '觀察' ? 'medium' : 'observe'">{{ historicalInsight.evidenceType === 'direct_item' ? '歷年相似題型' : '歷年同向度鏡像' }}</span></div>
          <div class="subject360-history-item-summary"><p><b>目前訊號</b>{{ formatPercent(selectedStat?.rate, 1) }} 答對率｜{{ historicalInsight.signal }}</p><p><b>判讀</b>{{ historicalInsight.diagnosis }}</p><p><b>學生可能卡點</b>{{ historicalInsight.blindSpot }}</p><p><b>歷年鏡像</b>{{ historicalInsight.historicalMirror }}</p></div>
          <div class="subject360-history-item-columns">
            <div><b>可能的錯誤假設</b><ul><li v-for="misconception in historicalInsight.misconceptions" :key="misconception">{{ misconception }}</li></ul></div>
            <div><b>教學建議與檢核</b><ol><li v-for="(move, index) in historicalInsight.teachingMoves" :key="move">{{ move }}<small v-if="historicalInsight.checks?.[index]">檢核：{{ historicalInsight.checks[index] }}</small></li></ol></div>
          </div>
          <details class="subject360-history-item-details"><summary>課堂引導提問與報告來源</summary><ul class="subject360-prompt-list"><li v-for="prompt in historicalInsight.prompts" :key="prompt">{{ prompt }}</li></ul><ul class="subject360-source-list"><li v-for="source in historicalInsight.sources" :key="`${source.year}-${source.file}-${source.section}`">{{ source.year }}｜{{ source.file }}｜{{ source.section }}</li></ul></details>
        </article>
        <article class="subject360-card">
          <div class="subject360-card-head"><h3>需要回到題目確認的學生</h3><span>最多顯示 12 人</span></div>
          <div v-if="affectedStudents.length" class="subject360-tag-list">
            <button v-for="student in affectedStudents" :key="student.id" type="button" class="subject360-tag emphasis" @click="emit('select-student', student.id)">{{ student.class }}班 {{ student.seat }}號</button>
          </div>
          <p v-else class="subject360-empty">目前範圍沒有錯答或未答學生。</p>
        </article>
      </div>
    </section>
  </div>
</template>
