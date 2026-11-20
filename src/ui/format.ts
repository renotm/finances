import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseYM } from '../engine/core/dates'

/** Formats de nombres et de dates selon la langue courante. */
export function useFormat() {
  const { locale } = useI18n()
  const tag = computed(() => (locale.value === 'fr' ? 'fr-FR' : 'en-GB'))

  const eurFmt = computed(
    () => new Intl.NumberFormat(tag.value, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  )
  const pctFmt = computed(
    () => new Intl.NumberFormat(tag.value, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  )
  const numFmt = computed(() => new Intl.NumberFormat(tag.value, { maximumFractionDigits: 1 }))
  const monthFmt = computed(() => new Intl.DateTimeFormat(tag.value, { month: 'short', year: 'numeric' }))

  return {
    eur: (v: number) => eurFmt.value.format(Math.abs(v) < 0.5 ? 0 : v),
    pct: (v: number | null) => (v === null ? '—' : pctFmt.value.format(v)),
    num: (v: number) => numFmt.value.format(v),
    month: (ym: string) => {
      const { year, month } = parseYM(ym)
      return monthFmt.value.format(new Date(year, month - 1, 1))
    },
    monthNames: computed(() =>
      Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(tag.value, { month: 'long' }).format(new Date(2000, i, 1))),
    ),
  }
}
