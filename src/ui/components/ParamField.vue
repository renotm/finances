<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParamDef, ParamValue, SimParams } from '../../engine/types'
import { useFormat } from '../format'
import YearMonthInput from './YearMonthInput.vue'

const props = defineProps<{ def: ParamDef; params: SimParams; idPrefix: string }>()
const emit = defineEmits<{ update: [key: string, value: ParamValue] }>()
const { t, te } = useI18n()
const f = useFormat()

const action = computed(() => (props.def.action && props.def.action.visible(props.params) ? props.def.action : null))
const actionHint = computed(() => {
  if (!action.value) return ''
  const { key, amounts } = action.value.hint(props.params)
  const formatted = Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, f.eur(v)]))
  return t(`actions.${action.value.id}.${key}`, formatted)
})

function runAction() {
  if (action.value) emit('update', props.def.key, action.value.value(props.params))
}

const id = computed(() => `${props.idPrefix}-${props.def.key}`)
const value = computed(() => props.params[props.def.key] as ParamValue)
const hintKey = computed(() => `hints.${props.def.key}`)

const unitLabel = computed(() => {
  switch (props.def.unit) {
    case 'eur':
      return '€'
    case 'pct':
      return '%'
    case 'years':
    case 'months':
    case 'age':
    case 'yearsPerDecade':
      return t(`units.${props.def.unit}`)
    default:
      return ''
  }
})

function optionLabel(o: string | number): string {
  if (typeof o === 'number') return props.def.unit === 'pct' ? `${o} %` : String(o)
  return t(`options.${props.def.key}.${o}`)
}

function onNumber(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') return
  let v = Number(raw)
  if (!Number.isFinite(v)) return
  if (props.def.min !== undefined) v = Math.max(props.def.min, v)
  if (props.def.max !== undefined) v = Math.min(props.def.max, v)
  emit('update', props.def.key, v)
}

function onSelect(e: Event) {
  const raw = (e.target as HTMLSelectElement).value
  const isNumeric = props.def.options?.some((o) => typeof o === 'number')
  emit('update', props.def.key, isNumeric ? Number(raw) : raw)
}
</script>

<template>
  <div class="field" :class="{ 'field--check': def.type === 'boolean' }">
    <template v-if="def.type === 'boolean'">
      <input :id="id" type="checkbox" :checked="value === true" @change="emit('update', def.key, ($event.target as HTMLInputElement).checked)" />
      <label :for="id">{{ t(`params.${def.key}`) }}</label>
    </template>

    <template v-else>
      <div v-if="action" class="field__label-row">
        <label :for="id">{{ t(`params.${def.key}`) }}</label>
        <button type="button" class="btn-mini" :title="actionHint" @click="runAction">
          {{ t(`actions.${action.id}.button`) }}
        </button>
      </div>
      <label v-else :for="id">{{ t(`params.${def.key}`) }}</label>

      <YearMonthInput
        v-if="def.type === 'yearMonth'"
        :id="id"
        :label="t(`params.${def.key}`)"
        :model-value="String(value)"
        @update:model-value="emit('update', def.key, $event)"
      />

      <select v-else-if="def.type === 'select'" :id="id" :value="value" @change="onSelect">
        <option v-for="o in def.options" :key="o" :value="o">{{ optionLabel(o) }}</option>
      </select>

      <div v-else class="input-unit">
        <input
          :id="id"
          type="number"
          inputmode="decimal"
          :min="def.min"
          :max="def.max"
          :step="def.step ?? 'any'"
          :value="value"
          @change="onNumber"
        />
        <span v-if="unitLabel" class="unit">{{ unitLabel }}</span>
      </div>
    </template>

    <p v-if="actionHint" class="hint">{{ actionHint }}</p>
    <p v-if="te(hintKey)" class="hint">{{ t(hintKey) }}</p>
  </div>
</template>
