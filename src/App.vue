<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from './config/defaults'
import { runSimulation } from './engine/run'
import { setLocale, type Locale } from './i18n'
import DetailTables from './ui/components/DetailTables.vue'
import EvolutionChart from './ui/components/EvolutionChart.vue'
import ProductPanel from './ui/components/ProductPanel.vue'
import SummaryCards from './ui/components/SummaryCards.vue'
import { createSlot, MAX_SLOTS, resetSlot, switchProduct, type Slot } from './ui/slots'

const { t, locale } = useI18n()

const slots = reactive<Slot[]>([createSlot('livretA'), createSlot('assuranceVie')])
const view = ref<'gross' | 'net'>('net')

const items = computed(() => slots.map((slot) => ({ slot, run: runSimulation(slot.productId, slot.params) })))

function addSlot() {
  if (slots.length < MAX_SLOTS) slots.push(createSlot('per'))
}
function removeSlot(index: number) {
  slots.splice(index, 1)
}

const updatedAt = computed(() => {
  const [y, m, d] = config.updatedAt.split('-').map(Number)
  return new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long' }).format(new Date(y, m - 1, d))
})
</script>

<template>
  <header class="topbar">
    <div class="container topbar__inner">
      <div>
        <h1>{{ t('app.title') }}</h1>
        <p class="muted">{{ t('app.subtitle') }}</p>
      </div>
      <div class="topbar__controls">
        <div class="segmented" role="group" :aria-label="t('app.viewLabel')" :title="t('app.viewHelp')">
          <button type="button" :aria-pressed="view === 'gross'" @click="view = 'gross'">{{ t('app.gross') }}</button>
          <button type="button" :aria-pressed="view === 'net'" @click="view = 'net'">{{ t('app.net') }}</button>
        </div>
        <div class="segmented" role="group" :aria-label="t('app.language')">
          <button
            v-for="l in (['fr', 'en'] as Locale[])"
            :key="l"
            type="button"
            :aria-pressed="locale === l"
            @click="setLocale(l)"
          >
            {{ l.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    <section class="panels" :class="`panels--${slots.length}`">
      <ProductPanel
        v-for="(slot, idx) in slots"
        :key="slot.id"
        :entry="slot"
        :index="idx"
        :can-remove="slots.length > 1"
        @remove="removeSlot(idx)"
        @change-product="switchProduct(slot, $event)"
        @reset="resetSlot(slot)"
      />
      <button v-if="slots.length < MAX_SLOTS" type="button" class="panel-add" @click="addSlot">
        <span aria-hidden="true">+</span>
        {{ t('app.addProduct') }}
      </button>
    </section>

    <section class="block">
      <div class="block__head">
        <h2>{{ t('summary.title') }}</h2>
        <p class="muted small">{{ t('app.viewHelp') }}</p>
      </div>
      <SummaryCards :items="items" :view="view" />
    </section>

    <section class="block">
      <h2>{{ t('chart.title') }}</h2>
      <div class="surface">
        <EvolutionChart :items="items" :view="view" />
      </div>
    </section>

    <section class="block">
      <details class="surface details">
        <summary><h2>{{ t('table.title') }}</h2></summary>
        <DetailTables :items="items" />
      </details>
    </section>
  </main>

  <footer class="container footer muted small">
    <p>{{ t('app.disclaimer') }}</p>
    <p>{{ t('app.defaultsDate', { date: updatedAt }) }}</p>
  </footer>
</template>
