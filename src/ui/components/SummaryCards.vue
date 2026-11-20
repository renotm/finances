<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { presentValue, realReturn } from '../../engine/core/irr'
import type { SlotResult } from '../../engine/run'
import { slotColor } from '../colors'
import { useFormat } from '../format'
import type { Slot } from '../slots'

const props = defineProps<{ items: { slot: Slot; run: SlotResult }[]; view: 'gross' | 'net'; inflation: number }>()
const { t } = useI18n()
const f = useFormat()

/** Indicateurs de comparaison (SPEC §3.6), selon la vue brute ou nette. */
function metrics(run: SlotResult) {
  const s = run.result.summary
  const net = props.view === 'net'
  const nominal = net ? s.annualReturnNet : s.annualReturnGross
  const status = net ? s.annualReturnNetStatus : s.annualReturnGrossStatus
  const keptSavings = s.taxSavings - s.reinvestedSavings
  return {
    nominal,
    status,
    real: nominal === null ? null : realReturn(nominal, props.inflation),
    presentValue: presentValue(net ? run.result.flows.net : run.result.flows.gross, props.inflation),
    effort: s.totalDeposited - s.reinvestedSavings,
    keptSavings,
    available: s.finalNet - keptSavings,
  }
}

/** Paramètres d'un avertissement : les montants (plafond, montant perdu…) sont formatés en euros. */
const EUR_PARAMS = ['cap', 'ceiling', 'amount']
function warningParams(params?: Record<string, string | number>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params ?? {}).map(([k, v]) => [k, EUR_PARAMS.includes(k) ? f.eur(Number(v)) : v]),
  )
}

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
        <div v-if="run.result.summary.reinvestedSavings > 0.5">
          <dt>{{ t('summary.reinvested') }}</dt><dd>{{ f.eur(run.result.summary.reinvestedSavings) }}</dd>
        </div>
        <div v-if="run.result.summary.totalWithdrawn > 0">
          <dt>{{ t('summary.withdrawn') }}</dt><dd>{{ f.eur(run.result.summary.totalWithdrawn) }}</dd>
        </div>
        <div><dt>{{ t('summary.gains') }}</dt><dd class="pos">{{ f.eur(run.result.summary.gains) }}</dd></div>
        <div v-if="run.result.summary.fees > 0.5"><dt>{{ t('summary.fees') }}</dt><dd class="neg">−{{ f.eur(run.result.summary.fees) }}</dd></div>
        <div v-if="run.result.summary.taxes > 0.5"><dt>{{ t('summary.taxes') }}</dt><dd class="neg">−{{ f.eur(run.result.summary.taxes) }}</dd></div>
        <div v-if="run.result.summary.taxSavings > 0">
          <dt>{{ t('summary.taxSavings') }}</dt><dd class="pos">+{{ f.eur(run.result.summary.taxSavings) }}</dd>
        </div>
        <div v-for="line in run.result.extraLines ?? []" :key="line.key">
          <dt>{{ t(`summary.extra.${line.key}`) }}</dt><dd>{{ f.eur(line.amount) }}</dd>
        </div>
        <div v-if="view === 'net' && metrics(run).keptSavings > 0.5">
          <dt>{{ t('summary.available') }}</dt><dd>{{ f.eur(metrics(run).available) }}</dd>
        </div>
        <div>
          <dt>{{ view === 'net' ? t('summary.returnNet') : t('summary.returnGross') }}</dt>
          <dd>{{ metrics(run).status === 'ok' ? f.pct(metrics(run).nominal) : t(`summary.irr.${metrics(run).status}`) }}</dd>
        </div>
        <div v-if="metrics(run).real !== null">
          <dt>{{ t('summary.realReturn') }}</dt><dd>{{ f.pct(metrics(run).real) }}</dd>
        </div>
        <div>
          <dt>{{ t('summary.presentValue') }}</dt><dd>{{ f.eur(metrics(run).presentValue) }}</dd>
        </div>
      </dl>

      <div v-if="run.result.annuity" class="card__annuity">
        <h4>{{ run.result.annuity.indicative ? t('summary.annuityIndicative') : t('summary.annuity') }}</h4>
        <dl class="card__list">
          <div><dt>{{ t('summary.annuityMonthly') }}</dt><dd>{{ f.eur(run.result.annuity.netYearly / 12) }}</dd></div>
          <template v-if="!run.result.annuity.indicative">
            <div><dt>{{ t('summary.annuityGross') }}</dt><dd>{{ f.eur(run.result.annuity.grossYearly) }}</dd></div>
            <div><dt>{{ t('summary.annuityNet') }}</dt><dd>{{ f.eur(run.result.annuity.netYearly) }}</dd></div>
            <div v-if="run.result.annuity.annuityPrice !== null && run.result.annuity.tableAge !== null">
              <dt>{{ t('summary.annuityCalc') }}</dt>
              <dd>{{ t('summary.annuityCalcValue', { price: f.num(run.result.annuity.annuityPrice), age: f.num(run.result.annuity.tableAge) }) }}</dd>
            </div>
            <div v-if="run.result.annuity.guaranteedNetYearly !== null">
              <dt>{{ t('summary.annuityGuaranteed') }}</dt>
              <dd>{{ f.eur(run.result.annuity.guaranteedNetYearly / 12) }}</dd>
            </div>
            <div v-if="run.result.annuity.totalNet !== null && run.result.annuity.endAge !== null">
              <dt>{{ t('summary.annuityTotal', { age: f.num(run.result.annuity.endAge) }) }}</dt>
              <dd class="pos">{{ f.eur(run.result.annuity.totalNet) }}</dd>
            </div>
          </template>
          <div>
            <dt>{{ t('summary.capitalAlternative') }}</dt>
            <dd>{{ f.eur(run.result.annuity.capitalAlternativeNet) }}</dd>
          </div>
          <div v-if="run.result.annuity.breakEvenAge !== null">
            <dt>{{ t('summary.breakEvenAge') }}</dt>
            <dd>{{ t('summary.ageValue', { n: f.num(run.result.annuity.breakEvenAge) }) }}</dd>
          </div>
        </dl>
        <p class="hint">{{ run.result.annuity.estimated ? t('summary.annuityEstimateNote') : t('summary.annuityContractNote') }}</p>
      </div>

      <ul v-if="run.result.warnings.length" class="warnings">
        <li v-for="w in run.result.warnings" :key="w.code + JSON.stringify(w.params)">
          {{ t(`warnings.${w.code}`, warningParams(w.params)) }}
        </li>
      </ul>
    </article>
  </div>
</template>
