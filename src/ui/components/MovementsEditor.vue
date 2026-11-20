<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { addMonths, formatYM, parseYM } from '../../engine/core/dates'
import type { Movement, MovementKind } from '../../engine/types'
import YearMonthInput from './YearMonthInput.vue'

const props = defineProps<{ movements: Movement[]; kinds: MovementKind[]; start: string; idPrefix: string }>()
const { t } = useI18n()

let nextId = Date.now()

function add() {
  props.movements.push({
    id: nextId++,
    date: formatYM(addMonths(parseYM(props.start), 12)),
    amount: 1000,
    kind: props.kinds[0],
  })
}

function remove(id: number) {
  const i = props.movements.findIndex((m) => m.id === id)
  if (i >= 0) props.movements.splice(i, 1)
}

function setAmount(m: Movement, e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  m.amount = Number.isFinite(v) ? Math.max(0, v) : 0
}
</script>

<template>
  <div class="movements">
    <p v-if="movements.length === 0" class="muted">{{ t('panel.noMovement') }}</p>
    <ul v-else class="movements__list">
      <li v-for="m in movements" :key="m.id" class="movement">
        <YearMonthInput v-model="m.date" :label="t('movement.date')" />
        <select v-model="m.kind" :aria-label="t('movement.kind')">
          <option v-for="k in kinds" :key="k" :value="k">{{ t(`movement.${k}`) }}</option>
        </select>
        <div class="input-unit">
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="100"
            :value="m.amount"
            :aria-label="t('movement.amount')"
            @change="setAmount(m, $event)"
          />
          <span class="unit">€</span>
        </div>
        <button type="button" class="btn-icon" :title="t('panel.deleteMovement')" :aria-label="t('panel.deleteMovement')" @click="remove(m.id)">
          ×
        </button>
      </li>
    </ul>
    <button type="button" class="btn-link" @click="add">+ {{ t('panel.addMovement') }}</button>
  </div>
</template>

<style scoped>
.movements__list {
  list-style: none;
  margin: 0 0 0.5rem;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}
.movement {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  padding: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
}
.movement > :first-child,
.movement > select,
.movement > .input-unit {
  grid-column: 1;
}
.movement > .btn-icon {
  grid-column: 2;
  grid-row: 1;
}
</style>
