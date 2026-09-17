<script setup>
import { computed } from 'vue';
import {
  formatCount,
  formatPercent,
  formatPoints,
  getDimensionStat,
  getItemStat,
  getOverall,
  getClassIds
} from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, default: () => [] },
  scopeLabel: { type: String, default: '' }
});

const emit = defineEmits(['open-item']);
const analysis = computed(() => props.subject.historicalAnalysis || null);
const legacyAdvice = computed(() => props.subject.teachingAdvice || null);
const scope = computed(() => props.selectedClasses.length ? props.selectedClasses : getClassIds(props.subject));
const currentOverall = computed(() => getOverall(props.subject, scope.value));
const historicalAverage = computed(() => {
  const rates = analysis.value?.overall?.historical?.map((entry) => entry.rate).filter((rate) => rate != null) || [];
  return rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null;
});
const dimensionRows = computed(() => (analysis.value?.dimensions || [])
  .map((dimension) => {
    const stat = getDimensionStat(props.subject, 'content', dimension.key, scope.value);
    const currentRate = stat?.rate ?? dimension.currentRate;
    return {
      ...dimension,
      currentRate,
      historyGap: currentRate == null || dimension.historyAverage == null ? null : currentRate - dimension.historyAverage
    };
  })
  .sort((a, b) => (a.currentRate ?? 1) - (b.currentRate ?? 1)));
const priorityDimensions = computed(() => dimensionRows.value
  .filter((dimension) => dimension.currentRate < 0.7 || dimension.recurrenceYears?.length >= 2)
  .slice(0, 4));
const itemRows = computed(() => Object.values(analysis.value?.itemInsights || {})
  .map((insight) => {
    const stat = getItemStat(props.subject, insight.q, scope.value);
    const currentRate = stat?.rate ?? insight.currentRate;
    const level = currentRate < 0.4 ? '優先查看' : currentRate < 0.6 ? '需查看' : currentRate < 0.7 ? '觀察' : '一般';
    return { ...insight, currentRate, level, topWrong: stat?.topWrong || insight.topWrong };
  })
  .sort((a, b) => (a.currentRate ?? 1) - (b.currentRate ?? 1)));
const priorityItems = computed(() => itemRows.value.filter((item) => item.currentRate < 0.6).length);
const priorityDimensionCount = computed(() => dimensionRows.value.filter((dimension) => dimension.currentRate < 0.7 || dimension.recurrenceYears?.length >= 2).length);

function priorityClass(level) {
  if (level === '優先查看' || level === '需查看') return 'high';
  if (level === '觀察') return 'medium';
  return 'observe';
}
</script>

<template>
  <article v-if="analysis || legacyAdvice" class="subject360-card subject360-advice-card subject360-section-gap">
    <template v-if="analysis">
      <div class="subject360-card-head">
        <div><h3>115 題目表現與歷年報告</h3><p class="subject360-advice-topic">115 題目資料｜對照 {{ analysis.historicalYears.join('、') }} 年官方五年級報告</p></div>
        <span class="subject360-badge">校內資料・歷年報告</span>
      </div>
      <div class="subject360-notice info">{{ analysis.summary }}</div>
      <div class="subject360-mini-grid subject360-advice-kpis">
        <div><span>目前範圍整體</span><strong>{{ formatPercent(currentOverall.rate, 1) }}</strong><small>{{ scopeLabel || '目前範圍' }}｜N={{ formatCount(currentOverall.valid) }}</small></div>
        <div><span>112–114 整體平均</span><strong>{{ formatPercent(historicalAverage, 1) }}</strong><small>歷年報告向度基線</small></div>
        <div><span>待優先向度</span><strong>{{ priorityDimensionCount }}</strong><small>目前低於 70% 或歷年反覆偏低</small></div>
        <div><span>需優先查看題目</span><strong>{{ priorityItems }}</strong><small>目前答對率低於 60%</small></div>
      </div>

      <div class="subject360-grid subject360-grid-2 subject360-history-overview">
        <article class="subject360-card">
          <div class="subject360-card-head"><h3>歷年整體對照</h3><span>群體基線，不是同一批學生追蹤</span></div>
          <div class="subject360-history-years">
            <div v-for="entry in analysis.overall.historical" :key="entry.year"><span>{{ entry.year }} 年</span><strong>{{ formatPercent(entry.rate, 1) }}</strong><i><em :style="{ width: `${Math.max(1, entry.rate * 100)}%` }" /></i></div>
            <div class="current"><span>115 校內</span><strong>{{ formatPercent(currentOverall.rate, 1) }}</strong><i><em :style="{ width: `${Math.max(1, (currentOverall.rate || 0) * 100)}%` }" /></i></div>
          </div>
          <p class="subject360-caption">{{ analysis.methodology }}</p>
        </article>
        <article class="subject360-card">
          <div class="subject360-card-head"><h3>本期教學循環</h3><span>先處理概念，再補熟練</span></div>
          <div class="subject360-plan-list">
            <div v-for="plan in analysis.teachingPlan" :key="plan.title">
              <strong>{{ plan.title }}</strong><small>{{ plan.focus }}</small>
              <ol><li v-for="step in plan.steps" :key="step">{{ step }}</li></ol>
              <p><b>觀察點</b>{{ plan.lookFor }}</p>
            </div>
          </div>
        </article>
      </div>

      <div class="subject360-card subject360-history-dimension-card">
        <div class="subject360-card-head"><div><h3>學生可能卡點與教學建議</h3><p>依目前範圍排序；每張卡保留 112–114 年報告的對照依據。</p></div><span>前 {{ priorityDimensions.length }} 個優先向度</span></div>
        <div class="subject360-history-dimension-grid">
          <article v-for="dimension in priorityDimensions" :key="dimension.key" class="subject360-history-dimension">
            <header><div><strong>{{ dimension.label }}</strong><small>{{ dimension.title }}｜{{ dimension.trend }}</small></div><span class="subject360-priority" :class="priorityClass(dimension.status === 'priority' ? '優先查看' : dimension.status === 'watch' ? '觀察' : '一般')">{{ formatPercent(dimension.currentRate, 1) }}</span></header>
            <p><b>目前可能卡點</b>{{ dimension.blindSpot }}</p>
            <p><b>歷年資料</b>{{ dimension.historicalMirror }}</p>
            <div class="subject360-history-actions">
              <div v-for="action in dimension.actions" :key="action.title"><strong>{{ action.title }}</strong><p>{{ action.action }}</p><small>檢核：{{ action.check }}</small></div>
            </div>
            <details><summary>課堂引導提問與來源</summary><ul class="subject360-prompt-list"><li v-for="prompt in dimension.prompts" :key="prompt">{{ prompt }}</li></ul><ul class="subject360-source-list"><li v-for="source in dimension.sources" :key="`${source.year}-${source.file}-${source.section}`">{{ source.year }}｜{{ source.file }}｜{{ source.section }}</li></ul></details>
          </article>
        </div>
        <p v-if="!priorityDimensions.length" class="subject360-empty">目前沒有低於門檻的向度；仍可從下方題目資料查看歷年鏡像。</p>
      </div>

      <details class="subject360-card subject360-history-items">
        <summary><strong>查看全部 {{ formatCount(itemRows.length) }} 題的 115 題目表現判讀</strong><span>答對率由低到高；點題目可開啟試題資料</span></summary>
        <div class="subject360-table-wrap">
          <table class="subject360-table"><thead><tr><th>題目</th><th>目前答對率</th><th>判讀</th><th>第一個教學檢核</th></tr></thead><tbody>
            <tr v-for="item in itemRows" :key="item.q">
              <td><button type="button" class="subject360-link-button" @click="emit('open-item', item.q)">Q{{ item.q }} {{ item.label }}</button><small>{{ item.dimension }}</small></td>
              <td><strong>{{ formatPercent(item.currentRate, 1) }}</strong><small>{{ item.signal }}</small></td>
              <td><span class="subject360-priority" :class="priorityClass(item.level)">{{ item.level }}</span><small>{{ item.evidenceType === 'direct_item' ? '歷年相似題型' : '歷年同向度資料' }}</small></td>
              <td>{{ item.teachingMoves[0] }}</td>
            </tr>
          </tbody></table>
        </div>
      </details>
      <p class="subject360-caption subject360-advice-footnote">{{ analysis.methodology }}</p>
    </template>

    <template v-else>
      <div class="subject360-card-head"><div><h3>歷史教學建議</h3><p class="subject360-advice-topic">{{ legacyAdvice.topic }}｜{{ legacyAdvice.grade }}｜借鑑 {{ legacyAdvice.historicalYears.join('、') }} 年資料</p></div><span class="subject360-badge">查詢年度 {{ legacyAdvice.queryYear }}</span></div>
      <div class="subject360-notice info">{{ legacyAdvice.summary }}</div>
      <div class="subject360-advice-grid">
        <article v-for="(item, index) in legacyAdvice.actions" :key="item.title" class="subject360-advice-item">
          <span class="subject360-advice-index">0{{ index + 1 }}</span>
          <div><h4>{{ item.title }}</h4><p><b>教學做法</b>{{ item.action }}</p><p><b>歷史證據</b>{{ item.evidence }}</p></div>
        </article>
      </div>
      <details class="subject360-advice-sources"><summary>查看歷史來源</summary><ul><li v-for="source in legacyAdvice.sources" :key="source.chunkId">{{ source.year }}｜{{ source.filename }}｜{{ source.chunkId }}</li></ul></details>
    </template>
  </article>
</template>
