<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProduct, products } from '../../engine/registry'
import type { ParamPatch, ParamValue } from '../../engine/types'
import { slotColor } from '../colors'
import type { Slot } from '../slots'
import MovementsEditor from './MovementsEditor.vue'
import ParamField from './ParamField.vue'

const props = defineProps<{ entry: Slot; index: number; canRemove: boolean }>()
const emit = defineEmits<{ remove: []; changeProduct: [productId: string]; reset: [] }>()
const { t } = useI18n()

const product = computed(() => getProduct(props.entry.productId))
const visible = computed(() => product.value.params.filter((d) => !d.visible || d.visible(props.entry.params)))
const mainParams = computed(() => visible.value.filter((d) => d.group === 'main'))
const advancedParams = computed(() => visible.value.filter((d) => d.group === 'advanced'))
const idPrefix = computed(() => `slot${props.entry.id}`)
const perYears = computed(() => Number(props.entry.params.retirementAge) - Number(props.entry.params.currentAge))

function update(key: string, value: ParamValue) {
  applyPatch({ [key]: value })
}

/** Applique une modification d'un ou plusieurs paramètres (champ saisi ou bouton d'action). */
function applyPatch(patch: ParamPatch) {
  for (const [key, value] of Object.entries(patch)) {
    props.entry.params[key] = value
    product.value.params.find((d) => d.key === key)?.onChange?.(props.entry.params)
  }
}
</script>

<template>
  <section class="panel" :style="{ '--slot-color': slotColor(index) }">
    <header class="panel__header">
      <span class="badge">{{ index + 1 }}</span>
      <label class="sr-only" :for="`${idPrefix}-product`">{{ t('panel.product') }}</label>
      <select
        :id="`${idPrefix}-product`"
        class="panel__product"
        :value="entry.productId"
        @change="emit('changeProduct', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in products" :key="p.id" :value="p.id">{{ t(`products.${p.id}`) }}</option>
      </select>
      <button v-if="canRemove" type="button" class="btn-icon" :title="t('panel.remove')" :aria-label="t('panel.remove')" @click="emit('remove')">
        ×
      </button>
    </header>

    <div class="panel__fields">
      <ParamField v-for="d in mainParams" :key="d.key" :def="d" :params="entry.params" :id-prefix="idPrefix" @update="update" @patch="applyPatch" />
      <p v-if="entry.productId === 'per' && perYears > 0" class="hint">{{ t('hints.durationPer', { years: perYears }) }}</p>
    </div>

    <details class="panel__section">
      <summary>{{ t('panel.movements') }} <span v-if="entry.params.movements.length" class="count">{{ entry.params.movements.length }}</span></summary>
      <MovementsEditor
        :movements="entry.params.movements"
        :kinds="product.movementKinds"
        :start="String(entry.params.start)"
        :id-prefix="idPrefix"
      />
    </details>

    <details v-if="advancedParams.length" class="panel__section">
      <summary>{{ t('panel.advanced') }}</summary>
      <div class="panel__fields">
        <ParamField v-for="d in advancedParams" :key="d.key" :def="d" :params="entry.params" :id-prefix="idPrefix" @update="update" @patch="applyPatch" />
      </div>
    </details>

    <button type="button" class="btn-link panel__reset" @click="emit('reset')">↺ {{ t('panel.reset') }}</button>
  </section>
</template>
