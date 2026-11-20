<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { config } from '../../config/defaults'
import { addMonths, currentYM, formatYM, parseYM } from '../../engine/core/dates'
import type { ChildAttachment, FamilySituation } from '../../engine/tax/incomeTax'
import { personTmiDetail, personTmiSchedule, type Person, type Sex } from '../../profiles/person'
import {
  clearAll,
  createPerson,
  duplicatePerson,
  profiles,
  removePerson,
  setActive,
  storageAvailable,
} from '../../profiles/store'
import { useFormat } from '../format'
import YearMonthInput from './YearMonthInput.vue'

const { t } = useI18n()
const f = useFormat()

const thisYear = parseYM(currentYM()).year

/** Personne en cours de modification (par défaut la personne active). */
const editedId = ref<number | null>(profiles.activeId ?? profiles.persons[0]?.id ?? null)
const edited = computed<Person | null>(() => profiles.persons.find((p) => p.id === editedId.value) ?? null)
watch(
  () => profiles.persons.length,
  () => {
    if (!edited.value) editedId.value = profiles.activeId ?? profiles.persons[0]?.id ?? null
  },
)

const situations: FamilySituation[] = ['single', 'married', 'divorced', 'widowed']
const sexes: Sex[] = ['unspecified', 'male', 'female']
const attachments: ChildAttachment[] = ['none', '21', '25']

function add() {
  const p = createPerson(t('profile.defaultName', { n: profiles.persons.length + 1 }))
  editedId.value = p.id
}

function duplicate() {
  if (!edited.value) return
  const copy = duplicatePerson(edited.value.id, t('profile.copySuffix'))
  if (copy) editedId.value = copy.id
}

function remove() {
  if (!edited.value) return
  if (!window.confirm(t('profile.confirmDelete', { name: edited.value.name }))) return
  removePerson(edited.value.id)
  editedId.value = profiles.activeId ?? profiles.persons[0]?.id ?? null
}

function wipe() {
  if (!window.confirm(t('profile.confirmClear'))) return
  clearAll()
  editedId.value = null
}

/** Champ numérique facultatif : vide = non renseigné (null). */
type NullableKey = 'retirementAge' | 'taxableIncome' | 'tmiRetirement' | 'professionalIncome' | 'ceilingYear' | 'carryN1' | 'carryN2' | 'carryN3'
function setNullable(key: NullableKey, e: Event) {
  if (!edited.value) return
  const raw = (e.target as HTMLInputElement).value.trim()
  const v = Number(raw)
  edited.value[key] = raw === '' || !Number.isFinite(v) ? null : Math.max(0, v)
}

function addChild() {
  if (!edited.value) return
  edited.value.children.push({
    id: Date.now(),
    birth: formatYM(addMonths(parseYM(currentYM()), -12 * 5)),
    attachment: '21',
    disabled: false,
  })
}

function removeChild(id: number) {
  if (!edited.value) return
  const i = edited.value.children.findIndex((c) => c.id === id)
  if (i >= 0) edited.value.children.splice(i, 1)
}

/** Calendrier de TMI de la personne à partir de cette année, regroupé par périodes. */
const tmiPeriods = computed(() => {
  if (!edited.value) return []
  const steps = personTmiSchedule(edited.value, thisYear) ?? []
  return steps.map((s, i) => ({ ...s, toYear: steps[i + 1] ? steps[i + 1].fromYear - 1 : null }))
})
const tmiThisYear = computed(() => (edited.value ? personTmiDetail(edited.value, thisYear) : null))

const carryFields: { key: 'carryN1' | 'carryN2' | 'carryN3'; offset: number }[] = [
  { key: 'carryN1', offset: 1 },
  { key: 'carryN2', offset: 2 },
  { key: 'carryN3', offset: 3 },
]

const parts = (n: number) => f.num(n)
</script>

<template>
  <div class="profiles">
    <aside class="profiles__list surface">
      <h2>{{ t('profile.listTitle') }}</h2>
      <p v-if="profiles.persons.length === 0" class="muted small">{{ t('profile.empty') }}</p>
      <ul v-else class="person-list">
        <li v-for="p in profiles.persons" :key="p.id">
          <button
            type="button"
            class="person-item"
            :class="{ 'person-item--edited': p.id === editedId }"
            :aria-pressed="p.id === editedId"
            @click="editedId = p.id"
          >
            <span class="person-item__name">{{ p.name || t('profile.unnamed') }}</span>
            <span v-if="p.id === profiles.activeId" class="person-item__active">{{ t('profile.active') }}</span>
          </button>
        </li>
      </ul>
      <button type="button" class="btn-link" @click="add">+ {{ t('profile.add') }}</button>

      <div class="profiles__storage">
        <p class="hint">{{ storageAvailable ? t('profile.storageNote') : t('profile.storageUnavailable') }}</p>
        <button v-if="profiles.persons.length" type="button" class="btn-link profiles__clear" @click="wipe">
          {{ t('profile.clearAll') }}
        </button>
      </div>
    </aside>

    <section v-if="edited" class="profiles__form surface">
      <header class="profiles__form-head">
        <h2>{{ edited.name || t('profile.unnamed') }}</h2>
        <div class="profiles__form-actions">
          <button v-if="edited.id !== profiles.activeId" type="button" class="btn-mini" @click="setActive(edited.id)">
            {{ t('profile.makeActive') }}
          </button>
          <button type="button" class="btn-mini" @click="duplicate">{{ t('profile.duplicate') }}</button>
          <button type="button" class="btn-mini" @click="remove">{{ t('profile.delete') }}</button>
        </div>
      </header>

      <fieldset class="profiles__group">
        <legend>{{ t('profile.identity') }}</legend>
        <div class="field">
          <label for="pf-name">{{ t('profile.name') }}</label>
          <input id="pf-name" v-model="edited.name" type="text" autocomplete="off" />
        </div>
        <div class="field">
          <label for="pf-birth">{{ t('profile.birth') }}</label>
          <YearMonthInput id="pf-birth" v-model="edited.birth" :label="t('profile.birth')" />
        </div>
        <div class="field">
          <label for="pf-sex">{{ t('profile.sex') }}</label>
          <select id="pf-sex" v-model="edited.sex">
            <option v-for="s in sexes" :key="s" :value="s">{{ t(`profile.sexes.${s}`) }}</option>
          </select>
          <p class="hint">{{ t('profile.sexHint', { male: config.endAgeBySex.male, female: config.endAgeBySex.female }) }}</p>
        </div>
        <div class="field">
          <label for="pf-retire">{{ t('params.retirementAge') }}</label>
          <div class="input-unit">
            <input id="pf-retire" type="number" min="50" max="80" step="1" :value="edited.retirementAge ?? ''" @change="setNullable('retirementAge', $event)" />
            <span class="unit">{{ t('units.age') }}</span>
          </div>
        </div>
      </fieldset>

      <fieldset class="profiles__group">
        <legend>{{ t('profile.household') }}</legend>
        <div class="field">
          <label for="pf-situation">{{ t('profile.situation') }}</label>
          <select id="pf-situation" v-model="edited.situation">
            <option v-for="s in situations" :key="s" :value="s">{{ t(`profile.situations.${s}`) }}</option>
          </select>
        </div>

        <div class="field">
          <span class="field__label">{{ t('profile.children') }}</span>
          <p v-if="edited.children.length === 0" class="muted small">{{ t('profile.noChildren') }}</p>
          <ul v-else class="children">
            <li v-for="(c, i) in edited.children" :key="c.id" class="child">
              <span class="child__title">{{ t('profile.child', { n: i + 1 }) }}</span>
              <YearMonthInput v-model="c.birth" :label="t('profile.childBirth')" />
              <select v-model="c.attachment" :aria-label="t('profile.attachment')">
                <option v-for="a in attachments" :key="a" :value="a">{{ t(`profile.attachments.${a}`) }}</option>
              </select>
              <label class="child__check">
                <input v-model="c.disabled" type="checkbox" />
                {{ t('profile.disabled') }}
              </label>
              <button type="button" class="btn-icon child__remove" :title="t('panel.deleteMovement')" :aria-label="t('panel.deleteMovement')" @click="removeChild(c.id)">×</button>
            </li>
          </ul>
          <button type="button" class="btn-link" @click="addChild">+ {{ t('profile.addChild') }}</button>
          <p class="hint">{{ t('profile.childrenHint') }}</p>
        </div>

        <div class="field">
          <label for="pf-income">{{ t('profile.taxableIncome') }}</label>
          <div class="input-unit">
            <input id="pf-income" type="number" min="0" step="1000" :value="edited.taxableIncome ?? ''" @change="setNullable('taxableIncome', $event)" />
            <span class="unit">€</span>
          </div>
        </div>
      </fieldset>

      <fieldset class="profiles__group">
        <legend>{{ t('profile.tmiTitle') }}</legend>
        <div class="field field--check">
          <input id="pf-tmi-manual" v-model="edited.tmiManual" type="checkbox" />
          <label for="pf-tmi-manual">{{ t('profile.tmiManual') }}</label>
        </div>
        <div v-if="edited.tmiManual" class="field">
          <label for="pf-tmi">{{ t('params.tmiNow') }}</label>
          <select id="pf-tmi" v-model.number="edited.tmiValue">
            <option v-for="o in config.tmiOptions" :key="o" :value="o">{{ o }} %</option>
          </select>
        </div>
        <template v-else>
          <p v-if="edited.taxableIncome === null" class="muted small">{{ t('profile.tmiNeedsIncome') }}</p>
          <template v-else>
            <ul class="tmi-periods">
              <li v-for="s in tmiPeriods" :key="s.fromYear">
                <span>{{ s.toYear === null ? t('profile.fromYear', { year: s.fromYear }) : t('profile.yearRange', { from: s.fromYear, to: s.toYear }) }}</span>
                <span class="strong">{{ s.tmi }} %</span>
                <span class="muted">{{ t('profile.parts', { n: parts(s.parts) }) }}</span>
              </li>
            </ul>
            <p v-if="tmiThisYear" class="hint">
              {{ t('profile.tmiDetail', { year: thisYear, quotient: f.eur(tmiThisYear.quotient) }) }}
              <template v-if="tmiThisYear.capped"> {{ t('profile.tmiCapped') }}</template>
            </p>
          </template>
        </template>
        <div class="field">
          <label for="pf-tmi-ret">{{ t('params.tmiRetirement') }}</label>
          <select id="pf-tmi-ret" :value="edited.tmiRetirement ?? ''" @change="setNullable('tmiRetirement', $event)">
            <option value="">{{ t('profile.notSet') }}</option>
            <option v-for="o in config.tmiOptions" :key="o" :value="o">{{ o }} %</option>
          </select>
        </div>
      </fieldset>

      <fieldset class="profiles__group">
        <legend>{{ t('profile.perTitle') }}</legend>
        <div class="field">
          <label for="pf-pro">{{ t('params.income') }}</label>
          <div class="input-unit">
            <input id="pf-pro" type="number" min="0" step="1000" :value="edited.professionalIncome ?? ''" @change="setNullable('professionalIncome', $event)" />
            <span class="unit">€</span>
          </div>
        </div>
        <div class="field">
          <label for="pf-ceiling">{{ t('params.ceilingOverride') }}</label>
          <div class="input-unit">
            <input id="pf-ceiling" type="number" min="0" step="100" :value="edited.ceilingYear ?? ''" @change="setNullable('ceilingYear', $event)" />
            <span class="unit">€</span>
          </div>
        </div>
        <div v-for="c in carryFields" :key="c.key" class="field">
          <label :for="`pf-${c.key}`">{{ t(`params.${c.key}`, { year: thisYear - c.offset }) }}</label>
          <div class="input-unit">
            <input :id="`pf-${c.key}`" type="number" min="0" step="100" :value="edited[c.key] ?? ''" @change="setNullable(c.key, $event)" />
            <span class="unit">€</span>
          </div>
        </div>
        <p class="hint">{{ t('profile.perHint') }}</p>
      </fieldset>
    </section>

    <section v-else class="profiles__form surface">
      <p class="muted">{{ t('profile.selectOrCreate') }}</p>
    </section>
  </div>
</template>
