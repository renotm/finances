<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from './config/defaults'
import { runSimulation } from './engine/run'
import { setLocale, type Locale } from './i18n'
import { profiles, setActive } from './profiles/store'
import DetailTables from './ui/components/DetailTables.vue'
import EvolutionChart from './ui/components/EvolutionChart.vue'
import ProductPanel from './ui/components/ProductPanel.vue'
import ProfilePage from './ui/components/ProfilePage.vue'
import SummaryCards from './ui/components/SummaryCards.vue'
import { applyProfile, createSlot, MAX_SLOTS, resetSlot, switchProduct, type Slot } from './ui/slots'
import { comparisonDiffs } from './ui/comparison'

/** Page de méthodologie chargée à la demande : elle ne pèse pas sur le chargement du simulateur. */
const MethodologyPage = defineAsyncComponent(() => import('./ui/methodology/MethodologyPage.vue'))

const { t, locale } = useI18n()

/**
 * Navigation par l'URL : `#/profil` affiche la page des profils, `#/methodologie` (et `#/methodologie/<section>`)
 * la méthodologie, tout le reste le simulateur.
 */
const hash = ref(window.location.hash)
const onHashChange = () => {
  hash.value = window.location.hash
  if (!methodologySection.value) window.scrollTo(0, 0)
}
window.addEventListener('hashchange', onHashChange)
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange))
const onProfilePage = computed(() => hash.value === '#/profil')
const onMethodologyPage = computed(() => hash.value === '#/methodologie' || hash.value.startsWith('#/methodologie/'))
/** Section de la méthodologie visée par l'URL (ancre), défilement géré par la page. */
const methodologySection = computed(() => (hash.value.startsWith('#/methodologie/') ? hash.value.slice('#/methodologie/'.length) : ''))
const onSimulator = computed(() => !onProfilePage.value && !onMethodologyPage.value)

/** Inflation supposée (%), pour le rendement réel et la valeur actuelle (SPEC §3.6). */
const inflation = ref<number>(config.comparison.inflationRate)
function onInflation(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) inflation.value = Math.min(20, Math.max(-5, v))
}

/** Différences d'effort d'épargne et d'horizon entre les colonnes comparées (SPEC §3.6). */
const comparisonNotes = computed(() => {
  const d = comparisonDiffs(items.value.map(({ run }) => run))
  const notes: string[] = []
  if (d.effortDiffers) notes.push(t('comparison.effort', { list: d.efforts.map((e, i) => `${i + 1} : ${formatEur(e)}`).join(', ') }))
  if (d.horizonDiffers) notes.push(t('comparison.horizon', { list: d.horizons.map((h, i) => `${i + 1} : ${Math.round(h / 1.2) / 10}`).join(', ') }))
  return notes
})
const formatEur = (v: number) =>
  new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

function onActiveChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  setActive(raw === '' ? null : Number(raw))
}

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
        <div class="topbar__person">
          <label class="sr-only" for="active-person">{{ t('profile.activeLabel') }}</label>
          <select id="active-person" class="topbar__select" :value="profiles.activeId ?? ''" @change="onActiveChange">
            <option value="">{{ t('profile.none') }}</option>
            <option v-for="p in profiles.persons" :key="p.id" :value="p.id">{{ p.name || t('profile.unnamed') }}</option>
          </select>
          <a v-if="!onProfilePage" class="btn-mini topbar__link" href="#/profil">{{ t('profile.link') }}</a>
          <a v-if="!onMethodologyPage" class="btn-mini topbar__link" href="#/methodologie">{{ t('methodology.link') }}</a>
          <a v-if="!onSimulator" class="btn-mini topbar__link" href="#/">{{ t('profile.back') }}</a>
        </div>
        <div v-if="onSimulator" class="segmented" role="group" :aria-label="t('app.viewLabel')" :title="t('app.viewHelp')">
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

  <main v-if="onProfilePage" class="container">
    <ProfilePage />
  </main>

  <main v-else-if="onMethodologyPage" class="container">
    <MethodologyPage :section="methodologySection" />
  </main>

  <main v-else class="container">
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
        @apply-profile="applyProfile(slot)"
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
      <div class="comparison">
        <div class="field comparison__inflation">
          <label for="inflation">{{ t('comparison.inflation') }}</label>
          <div class="input-unit">
            <input id="inflation" type="number" step="0.1" min="-5" max="20" :value="inflation" @change="onInflation" />
            <span class="unit">%</span>
          </div>
          <p class="hint">{{ t('comparison.inflationHint') }}</p>
        </div>
        <ul v-if="comparisonNotes.length" class="warnings comparison__notes">
          <li v-for="n in comparisonNotes" :key="n">{{ n }}</li>
        </ul>
      </div>
      <SummaryCards :items="items" :view="view" :inflation="inflation / 100" />
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
    <p>{{ t('app.fiscalStability') }}</p>
    <p>{{ t('app.defaultsDate', { date: updatedAt }) }}</p>
  </footer>
</template>
