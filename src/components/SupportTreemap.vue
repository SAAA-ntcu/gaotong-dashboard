<script setup>
import * as echarts from 'echarts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  subjects: { type: Array, required: true },
  classIds: { type: Array, required: true },
  classStats: { type: Object, required: true },
  selectedSubjectId: { type: String, default: '' }
});

const emit = defineEmits(['select-class', 'select-subject']);
const chartElement = ref(null);
let chart;
let resizeObserver;

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  const number = Number.parseInt(normalized, 16);
  return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function buildTree() {
  return props.subjects.map((subject) => {
    const children = props.classIds.map((classId) => {
      const stats = props.classStats[classId]?.subjects?.[subject.id];
      return {
        name: `${classId} 班`,
        classId,
        subjectId: subject.id,
        value: stats?.supportCount || 0,
        supportRate: stats?.supportRate || 0,
        tested: stats?.tested || 0,
        delta: stats?.delta || 0,
        itemStyle: {
          color: hexToRgba(subject.color, 0.48),
          borderColor: '#ffffff',
          borderWidth: 2
        }
      };
    });

    return {
      name: subject.name,
      subjectId: subject.id,
      value: children.reduce((sum, child) => sum + child.value, 0),
      children,
      itemStyle: {
        color: subject.color,
        borderColor: props.selectedSubjectId === subject.id ? '#172033' : '#ffffff',
        borderWidth: props.selectedSubjectId === subject.id ? 3 : 2
      }
    };
  });
}

function formatDelta(value) {
  return `${value > 0 ? '+' : value === 0 ? '±' : ''}${Number(value).toFixed(2)} pp`;
}

function renderChart() {
  if (!chartElement.value) return;
  if (!chart) chart = echarts.init(chartElement.value);

  chart.setOption({
    animationDuration: 480,
    animationDurationUpdate: 320,
    tooltip: {
      confine: true,
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: '#dfe6ef',
      borderWidth: 1,
      textStyle: { color: '#172033' },
      formatter: (params) => {
        const item = params.data;
        if (!item?.classId) {
          return `<strong>${item?.name || ''}</strong><br/>全學年待加強：${item?.value || 0} 人`;
        }
        return `<strong>${item.subjectId === 'math' ? '數學' : item.subjectId === 'english' ? '英語文' : '國語文'}・${item.classId} 班</strong>` +
          `<br/>待加強：${item.value} / ${item.tested} 人 (${Number(item.supportRate).toFixed(1)}%)` +
          `<br/>同儕差距：${formatDelta(item.delta)}`;
      }
    },
    series: [{
      type: 'treemap',
      data: buildTree(),
      roam: false,
      nodeClick: false,
      leafDepth: 2,
      squareRatio: 1.15,
      breadcrumb: { show: false },
      visibleMin: 1,
      upperLabel: {
        show: true,
        height: 25,
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 800,
        padding: [5, 8]
      },
      label: {
        show: true,
        color: '#172033',
        fontSize: 13,
        fontWeight: 800,
        formatter: (params) => params.data?.classId ? `${params.data.name}\n${params.data.value} 人` : ''
      },
      levels: [
        { itemStyle: { borderWidth: 0, gapWidth: 10 }, upperLabel: { show: false } },
        { itemStyle: { gapWidth: 5 }, upperLabel: { show: true } },
        { itemStyle: { gapWidth: 2 } }
      ]
    }]
  }, true);

  chart.off('click');
  chart.on('click', (params) => {
    if (params.data?.classId) emit('select-class', params.data.classId);
    else if (params.data?.subjectId) emit('select-subject', params.data.subjectId);
  });
}

onMounted(async () => {
  await nextTick();
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  if (chartElement.value) resizeObserver.observe(chartElement.value);
});

watch(() => [props.classStats, props.selectedSubjectId], renderChart, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>

<template>
  <div ref="chartElement" class="support-treemap" role="img" aria-label="各科目與班級待加強人數 Treemap" />
</template>
