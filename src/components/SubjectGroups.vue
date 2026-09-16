<script setup>
import { computed } from 'vue';
import { formatCount, formatPercent, getStudentGroups } from '../data/subject360';

const props = defineProps({
  subject: { type: Object, required: true },
  selectedClasses: { type: Array, required: true },
  scopeLabel: { type: String, required: true }
});

const emit = defineEmits(['select-student', 'open-item']);
const groups = computed(() => getStudentGroups(props.subject, props.selectedClasses));
const descriptions = {
  '特定概念待確認': '作答模式與某一選項反覆出現，仍需回到題目確認。',
  '作答表現不穩定／需進一步診斷': '缺答或向度間落差較大，建議先補充診斷證據。',
  '多題共同待支持': '多題共同偏低，適合先安排概念釐清與分組支持。'
};
</script>

<template>
  <div class="subject360-module">
    <div class="subject360-page-head"><div><h2>教學需求分組</h2><p>依本次作答證據形成暫時性教學需求群組，不把學生固定貼上高、中、低分標籤。</p></div><span class="subject360-badge">{{ scopeLabel }}</span></div>
    <div class="subject360-notice info">分組使用整體作答、向度差異、缺答比例與重複錯誤選項模式。這些群組是教學討論起點，不是一次測驗的固定能力診斷。</div>
    <div class="subject360-group-grid">
      <article v-for="group in groups" :key="group.name" class="subject360-group-card">
        <header><div><h3>{{ group.name }}</h3><p>{{ descriptions[group.name] }}</p></div><strong>{{ group.members.length }}<small>人</small></strong></header>
        <div class="subject360-group-body">
          <span class="subject360-label">共同弱點</span>
          <div class="subject360-tag-list"><span v-for="weak in group.commonWeak" :key="weak.key" class="subject360-tag">{{ weak.key }}<small>{{ weak.count }} 人</small></span><span v-if="!group.commonWeak.length" class="subject360-tag">目前沒有共同向度訊號</span></div>
          <span class="subject360-label">共同錯題</span>
          <div class="subject360-tag-list"><button v-for="wrong in group.commonWrong" :key="wrong.q" type="button" class="subject360-tag emphasis" @click="emit('open-item', wrong.q)">Q{{ wrong.q }}（{{ wrong.count }}人）</button><span v-if="!group.commonWrong.length" class="subject360-tag">目前沒有錯題資料</span></div>
          <details><summary>查看學生名單與作答摘要</summary><div class="subject360-table-wrap"><table class="subject360-table"><thead><tr><th>學生</th><th>整體</th><th>錯題／未答</th><th>需確認</th></tr></thead><tbody><tr v-for="member in group.members" :key="member.student.id"><td><button type="button" class="subject360-link-button" @click="emit('select-student', member.student.id)">{{ member.student.class }}班 {{ member.student.seat }}號</button><small>{{ member.student.id }}</small></td><td>{{ formatPercent(member.student.score) }}</td><td>{{ formatCount(member.profile.wrongItems.length) }}</td><td>{{ member.profile.weak.slice(0, 2).map((row) => row.key).join('、') || '—' }}</td></tr></tbody></table></div></details>
        </div>
      </article>
    </div>
    <div v-if="!groups.length" class="subject360-card subject360-empty">目前所選班級沒有可形成的分組資料。</div>
  </div>
</template>
