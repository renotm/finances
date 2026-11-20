<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SlotResult } from '../../engine/run'
import { slotColor } from '../colors'
import { useFormat } from '../format'
import type { Slot } from '../slots'

defineProps<{ items: { slot: Slot; run: SlotResult }[]; view: 'gross' | 'net' }>()
const { t } = useI18n()
const f = useFormat()

function duration(run: SlotResult): string {
  const first = run.result.points[0]
  const last = run.result.points[run.result.points.length - 1]
  const years = Math.round((last.t - first.t) * 10) / 10
  return t('summary.yearsValue', { n: f.num(years) })
}
</script>

<template>
  <div class="cards">
    <article v-for="({ slot, run }, idx) in items" :key="slot.id" class="card" :style="{ '--slot-color': slotColor(idx) }">
      <header class="card__header">
        <span class="badge">{{ idx + 1 }}</span>
        <h3>{{ t(`products.${slot.productId}`) }}</h3>
      </header>

      <p class="card__label">
        {{ view === 'net' ? t('summary.finalNet') : t('summary.finalGross') }}
        <span class="muted">{{ t('summary.after', { years: duration(run) }) }}</span>
      </p>
      <p class="card__value">{{ f.eur(view === 'net' ? run.result.summary.finalNet : run.result.summary.finalGross) }}</p>
      <p class="card__secondary muted">
        {{ view === 'net' ? t('summary.finalGross') : t('summary.finalNet') }} :
        {{ f.eur(view === 'net' ? run.result.summary.finalGross : run.result.summary.finalNet) }}
      </p>

      <dl class="card__list">
        <div><dt>{{ t('summary.deposited') }}</dt><dd>{{ f.eur(run.result.summary.totalDeposited) }}</dd></div>
        <div v-if="run.result.summary.totalWithdrawn > 0">
          <dt>{{ t('summary.withdrawn') }}</dt><dd>{{ f.eur(run.result.summary.totalWithdrawn) }}</dd>
        </div>
        <div><dt>{{ t('summary.gains') }}</dt><dd class="pos">{{ f.eur(run.result.summary.gains) }}</dd></div>
        <div v-if="run.result.summary.fees > 0.5"><dt>{{ t('summary.fees') }}</dt><dd class="neg">−{{ f.eur(run.result.summary.fees) }}</dd></div>
        <div v-if="run.result.summary.taxes > 0.5"><dt>{{ t('summary.taxes') }}</dt><dd class="neg">−{{ f.eur(run.result.summary.taxes) }}</dd></div>
        <div v-if="run.result.summary.taxSavings > 0">
          <dt>{{ t('summary.taxSavings') }}</dt><dd class="pos">+{{ f.eur(run.result.summary.taxSavings) }}</dd>
        </div>
        <div>
          <dt>{{ view === 'net' ? t('summary.returnNet') : t('summary.returnGross') }}</dt>
          <dd>{{ f.pct(view === 'net' ? run.result.summary.annualReturnNet : run.result.summary.annualReturnGross) }}</dd>
        </div>
      </dl>

      <div v-if="run.result.annuity" class="card__annuity">
        <h4>{{ t('summary.annuity') }}</h4>
        <dl class="card__list">
          <div><dt>{{ t('summary.annuityGross') }}</dt><dd>{{ f.eur(run.result.annuity.grossYearly) }}</dd></div>
          <div><dt>{{ t('summary.annuityNet') }}</dt><dd>{{ f.eur(run.result.annuity.netYearly) }}</dd></div>
          <div><dt>{{ t('summary.annuityMonthly') }}</dt><dd>{{ f.eur(run.result.annuity.netYearly / 12) }}</dd></div>
          <div v-if="run.result.annuity.breakEvenYears">
            <dt>{{ t('summary.breakEven') }}</dt>
            <dd>{{ t('summary.yearsValue', { n: f.num(run.result.annuity.breakEvenYears) }) }}</dd>
          </div>
        </dl>
      </div>

      <ul v-if="run.result.warnings.length" class="warnings">
        <li v-for="w in run.result.warnings" :key="w.code + JSON.stringify(w.params)">
          {{ t(`warnings.${w.code}`, { ...w.params, cap: w.params?.cap !== undefined ? f.eur(Number(w.params.cap)) : '', ceiling: w.params?.ceiling !== undefined ? f.eur(Number(w.params.ceiling)) : '' }) }}
        </li>
      </ul>
    </article>
  </div>
</template>
