<script setup>
import * as echarts from 'echarts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: Number, default: 300 },
  ariaLabel: { type: String, default: '科目資料圖表' }
});

const emit = defineEmits(['chart-click']);
const chartElement = ref(null);
let chart;
let resizeObserver;

function renderChart() {
  if (!chartElement.value) return;
  if (!chart) chart = echarts.init(chartElement.value);
  chart.setOption(props.option, true);
  chart.off('click');
  chart.on('click', (params) => emit('chart-click', params));
}

onMounted(async () => {
  await nextTick();
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartElement.value);
});

watch(() => props.option, renderChart, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>

<template>
  <div
    ref="chartElement"
    class="subject360-chart"
    :style="{ height: `${height}px` }"
    role="img"
    :aria-label="ariaLabel"
  />
</template>
