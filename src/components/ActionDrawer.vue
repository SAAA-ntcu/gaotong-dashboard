<script setup>
import { useRouter } from 'vue-router';
import { getClassSubjectStats, getSubject } from '../data/dashboard';

const props = defineProps({
  action: { type: Object, default: null },
  roleId: { type: String, default: 'principal' }
});
const emit = defineEmits(['close']);
const router = useRouter();

function openClass(classId) {
  router.push({ name: 'class', query: { role: props.roleId, class: classId } });
}

function deltaText(classId, subjectId) {
  if (!subjectId || !classId) return '';
  const stat = getClassSubjectStats(classId, subjectId);
  const subject = getSubject(subjectId);
  return `${subject.shortName} ${stat.delta > 0 ? '+' : ''}${stat.delta.toFixed(2)} pp`;
}
</script>

<template>
  <aside v-if="action" class="action-drawer" aria-label="建議措施">
    <div class="drawer-head">
      <div>
        <span class="status-chip warning">{{ action.badge }}</span>
        <h2>{{ action.title }}</h2>
      </div>
      <button class="icon-button" type="button" aria-label="關閉建議措施" @click="emit('close')">×</button>
    </div>

    <div class="drawer-links" v-if="action.classIds?.length">
      <span class="drawer-link-label">延伸檢視</span>
      <button v-for="classId in action.classIds" :key="classId" class="link-button" type="button" @click="openClass(classId)">
        開啟 {{ classId }} 班級
        <small v-if="action.subjectId">{{ deltaText(classId, action.subjectId) }}</small>
      </button>
    </div>

    <div class="drawer-grid">
      <section class="drawer-section">
        <span class="section-kicker">數據盲點</span>
        <p>{{ action.problem }}</p>
        <div class="drawer-meta"><strong>協同場域</strong>{{ action.who }}</div>
        <div class="drawer-meta"><strong>檢核節點</strong>{{ action.when }}</div>
      </section>
      <section class="drawer-section">
        <span class="section-kicker">支持路徑</span>
        <div v-for="item in action.actions" :key="item.title" class="action-item">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </div>
        <div class="kpi-callout"><strong>成效檢核</strong>{{ action.kpi }}</div>
      </section>
    </div>
  </aside>
</template>
