<script setup lang="ts">
import { computed } from 'vue'
import { formatYM, parseYM } from '../../engine/core/dates'
import { useFormat } from '../format'

const props = defineProps<{ modelValue: string; id?: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { monthNames } = useFormat()

const ym = computed(() => parseYM(props.modelValue))

function setMonth(e: Event) {
  emit('update:modelValue', formatYM({ year: ym.value.year, month: Number((e.target as HTMLSelectElement).value) }))
}
function setYear(e: Event) {
  const year = Number((e.target as HTMLInputElement).value)
  if (Number.isInteger(year) && year >= 1950 && year <= 2150) {
    emit('update:modelValue', formatYM({ year, month: ym.value.month }))
  }
}
</script>

<template>
  <div class="ym">
    <select :id="id" :value="ym.month" :aria-label="label" @change="setMonth">
      <option v-for="(name, i) in monthNames" :key="i" :value="i + 1">{{ name }}</option>
    </select>
    <input type="number" inputmode="numeric" min="1950" max="2150" :value="ym.year" :aria-label="label" @change="setYear" />
  </div>
</template>

<style scoped>
.ym {
  display: grid;
  grid-template-columns: 1fr 5.5rem;
  gap: 0.4rem;
}
</style>
