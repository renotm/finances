<script setup lang="ts">
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Point } from '../../engine/types'
import type { SlotResult } from '../../engine/run'
import { slotColor } from '../colors'
import { useFormat } from '../format'
import type { Slot } from '../slots'

ChartJS.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, Filler)

const props = defineProps<{ items: { slot: Slot; run: SlotResult }[]; view: 'gross' | 'net' }>()
const { t } = useI18n()
const f = useFormat()

interface XY {
  x: number
  y: number
  point: Point
}

const toXY = (pts: Point[]): XY[] => pts.map((p) => ({ x: p.t, y: props.view === 'net' ? p.net : p.gross, point: p }))

const data = computed<ChartData<'line', XY[]>>(() => ({
  datasets: props.items.flatMap(({ slot, run }, idx) => {
    const color = slotColor(idx)
    const label = `${idx + 1}. ${t(`products.${slot.productId}`)}`
    const sets: ChartData<'line', XY[]>['datasets'] = []
    if (run.band) {
      sets.push(
        { label: `${label} (${t('chart.range')} −)`, data: toXY(run.band.low), borderColor: 'transparent', pointRadius: 0, fill: false, isBand: true } as never,
        {
          label: `${label} (${t('chart.range')} +)`,
          data: toXY(run.band.high),
          borderColor: 'transparent',
          backgroundColor: color + '26',
          pointRadius: 0,
          fill: '-1',
          isBand: true,
        } as never,
      )
    }
    sets.push({
      label,
      data: toXY(run.result.points),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2.5,
      pointRadius: run.result.points.length > 25 ? 0 : 3,
      pointHoverRadius: 5,
      tension: 0.15,
    })
    return sets
  }),
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'nearest', intersect: false },
  parsing: false,
  scales: {
    x: {
      type: 'linear',
      ticks: { stepSize: 1, callback: (v) => String(Math.round(Number(v))) },
      grid: { color: 'rgba(128,128,128,0.15)' },
    },
    y: {
      ticks: { callback: (v) => f.eur(Number(v)) },
      grid: { color: 'rgba(128,128,128,0.15)' },
    },
  },
  plugins: {
    legend: {
      labels: { filter: (item, d) => !(d.datasets[item.datasetIndex!] as { isBand?: boolean }).isBand, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        title: (items) => {
          const p = (items[0]?.raw as XY | undefined)?.point
          if (!p) return ''
          return p.isStart ? t('chart.start', { date: f.month(p.date) }) : t('chart.end', { date: f.month(p.date) })
        },
        label: (item) => `${item.dataset.label} : ${f.eur(item.parsed.y ?? 0)}`,
      },
    },
  },
}))

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const chart = shallowRef<ChartJS<'line', XY[]>>()

onMounted(() => {
  if (!canvas.value) return
  // Couleur des textes du graphique alignée sur le thème (clair / sombre).
  ChartJS.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#667085'
  chart.value = new ChartJS(canvas.value, { type: 'line', data: data.value, options: options.value })
})

watch([data, options], ([d, o]) => {
  if (!chart.value) return
  chart.value.data = d
  chart.value.options = o
  chart.value.update('none')
})

onBeforeUnmount(() => chart.value?.destroy())
</script>

<template>
  <div class="chart">
    <canvas ref="canvas" role="img" :aria-label="t('chart.title')"></canvas>
  </div>
</template>

<style scoped>
.chart {
  position: relative;
  height: 360px;
}
@media (max-width: 640px) {
  .chart {
    height: 280px;
  }
}
</style>
