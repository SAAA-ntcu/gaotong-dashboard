<script setup>
import * as echarts from 'echarts';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  value: { type: Number, required: true },
  label: { type: String, default: '' },
  color: { type: String, default: '#2563eb' },
  min: { type: Number, default: -10 },
  max: { type: Number, default: 10 },
  mode: { type: String, default: 'delta' },
  height: { type: Number, default: 210 },
  compact: { type: Boolean, default: false }
});

const chartElement = ref(null);
let chart;
let resizeObserver;

function formatValue(value) {
  if (props.mode === 'percent') return `${Number(value).toFixed(1)}%`;
  return `${value > 0 ? '+' : value === 0 ? '±' : ''}${Number(value).toFixed(1)} pp`;
}

function renderChart() {
  if (!chartElement.value) return;
  if (!chart) chart = echarts.init(chartElement.value);

  const isDelta = props.mode === 'delta';
  const split = isDelta ? (0 - props.min) / (props.max - props.min) : 0.5;
  const axisColors = isDelta
    ? [[Math.max(0.01, split), '#e8edf4'], [1, '#dce5ef']]
    : [[0.5, '#e8edf4'], [1, '#dce5ef']];

  chart.setOption({
    animationDuration: 700,
    animationDurationUpdate: 500,
    series: [{
      type: 'gauge',
      min: props.min,
      max: props.max,
      splitNumber: isDelta ? 4 : 5,
      center: ['50%', '53%'],
      radius: props.compact ? '82%' : '91%',
      axisLine: { lineStyle: { width: props.compact ? 8 : 10, color: axisColors } },
      axisTick: { show: true, splitNumber: 2, length: 4, lineStyle: { width: 1, color: '#94a3b8' } },
      splitLine: { show: true, length: 8, lineStyle: { width: 1.5, color: '#64748b' } },
      axisLabel: {
        distance: props.compact ? 7 : 10,
        color: '#64748b',
        fontSize: props.compact ? 8 : 9,
        formatter: (value) => {
          if (isDelta) {
            if (value === 0) return '0';
            if (value === props.min || value === props.max) return `${value > 0 ? '+' : ''}${value}`;
            return '';
          }
          return value === 0 || value === 50 || value === 100 ? `${value}` : '';
        }
      },
      pointer: { length: props.compact ? '62%' : '68%', width: props.compact ? 3 : 4, itemStyle: { color: props.color } },
      anchor: { show: true, showAbove: true, size: props.compact ? 7 : 9, itemStyle: { borderWidth: 2, borderColor: props.color, color: '#ffffff' } },
      detail: {
        valueAnimation: true,
        formatter: (value) => formatValue(value),
        offsetCenter: [0, props.compact ? '68%' : '67%'],
        fontSize: props.compact ? 15 : 21,
        fontWeight: '800',
        color: props.color
      },
      title: {
        offsetCenter: [0, props.compact ? '91%' : '91%'],
        fontSize: props.compact ? 9 : 11,
        fontWeight: '600',
        color: '#475569'
      },
      data: [{ value: props.value, name: props.label }]
    }]
  }, true);
}

onMounted(async () => {
  await nextTick();
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  if (chartElement.value) resizeObserver.observe(chartElement.value);
});

watch(() => [props.value, props.label, props.color, props.min, props.max, props.mode, props.compact], renderChart);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = undefined;
});
</script>

<template>
  <div ref="chartElement" class="needle-gauge" :style="{ height: `${height}px` }" role="img" :aria-label="`${label} ${formatValue(value)}`" />
</template>
