<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SlotResult } from '../../engine/run'
import { slotColor } from '../colors'
import { useFormat } from '../format'
import type { Slot } from '../slots'

const props = defineProps<{ items: { slot: Slot; run: SlotResult }[] }>()
const { t } = useI18n()
const f = useFormat()

const active = ref(0)
watch(
  () => props.items.length,
  (n) => {
    if (active.value >= n) active.value = Math.max(0, n - 1)
  },
)
const current = computed(() => props.items[active.value])
const showSavings = computed(() => current.value?.run.result.years.some((y) => y.taxSavings > 0))
const showWithdrawals = computed(() => current.value?.run.result.years.some((y) => y.withdrawals > 0))
</script>

<template>
  <div v-if="current">
    <div class="tabs" role="tablist">
      <button
        v-for="({ slot }, idx) in items"
        :key="slot.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'tab--active': idx === active }"
        :aria-selected="idx === active"
        :style="{ '--slot-color': slotColor(idx) }"
        @click="active = idx"
      >
        <span class="badge">{{ idx + 1 }}</span> {{ t(`products.${slot.productId}`) }}
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('table.year') }}</th>
            <th>{{ t('table.deposits') }}</th>
            <th v-if="showWithdrawals">{{ t('table.withdrawals') }}</th>
            <th>{{ t('table.gains') }}</th>
            <th>{{ t('table.fees') }}</th>
            <th>{{ t('table.taxes') }}</th>
            <th v-if="showSavings">{{ t('table.taxSavings') }}</th>
            <th>{{ t('table.endValue') }}</th>
            <th>{{ t('table.netValue') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="y in current.run.result.years" :key="y.year">
            <th scope="row">{{ y.year }}</th>
            <td>{{ f.eur(y.deposits) }}</td>
            <td v-if="showWithdrawals">{{ f.eur(y.withdrawals) }}</td>
            <td>{{ f.eur(y.gains) }}</td>
            <td>{{ f.eur(y.fees) }}</td>
            <td>{{ f.eur(y.taxes) }}</td>
            <td v-if="showSavings">{{ f.eur(y.taxSavings) }}</td>
            <td class="strong">{{ f.eur(y.endValue) }}</td>
            <td>{{ f.eur(y.netValue) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
