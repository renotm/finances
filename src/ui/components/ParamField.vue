<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParamAction, ParamDef, ParamPatch, ParamValue, SimParams } from '../../engine/types'
import { useFormat } from '../format'
import YearMonthInput from './YearMonthInput.vue'

const props = defineProps<{ def: ParamDef; params: SimParams; idPrefix: string }>()
const emit = defineEmits<{ update: [key: string, value: ParamValue]; patch: [patch: ParamPatch] }>()
const { t, te } = useI18n()
const f = useFormat()

const label = computed(() => t(props.def.labelKey ?? `params.${props.def.key}`, props.def.labelParams?.(props.params) ?? {}))

const actions = computed(() => (props.def.actions ?? []).filter((a) => a.visible(props.params)))

function hintOf(a: ParamAction): string {
  if (!a.hint) return ''
  const { key, amounts, values } = a.hint(props.params)
  const formatted = Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, f.eur(v)]))
  return t(`actions.${a.id}.${key}`, { ...values, ...formatted })
}

function runAction(a: ParamAction) {
  emit('patch', a.apply(props.params))
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
      <label :for="id">{{ label }}</label>
    </template>

    <template v-else>
      <div v-if="actions.length" class="field__label-row">
        <label :for="id">{{ label }}</label>
        <span class="field__actions">
          <button v-for="a in actions" :key="a.id" type="button" class="btn-mini" :title="hintOf(a)" @click="runAction(a)">
            {{ t(`actions.${a.id}.button`) }}
          </button>
        </span>
      </div>
      <label v-else :for="id">{{ label }}</label>

      <YearMonthInput
        v-if="def.type === 'yearMonth'"
        :id="id"
        :label="label"
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

    <template v-for="a in actions" :key="a.id">
      <p v-if="a.hint" class="hint">{{ hintOf(a) }}</p>
    </template>
    <p v-if="te(hintKey)" class="hint">{{ t(hintKey) }}</p>
  </div>
</template>
