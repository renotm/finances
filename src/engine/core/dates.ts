import type { YearMonth } from '../types'

export interface YM {
  year: number
  month: number
}

export function parseYM(s: YearMonth): YM {
  const [y, m] = String(s).split('-').map(Number)
  const now = new Date()
  return {
    year: Number.isFinite(y) ? y : now.getFullYear(),
    month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1,
  }
}

export function formatYM(ym: YM): YearMonth {
  return `${ym.year}-${String(ym.month).padStart(2, '0')}`
}

/** Nombre de mois de a vers b (positif si b est après a). */
export function monthsBetween(a: YM, b: YM): number {
  return (b.year - a.year) * 12 + (b.month - a.month)
}

export function addMonths(ym: YM, n: number): YM {
  const idx = ym.year * 12 + (ym.month - 1) + n
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

export function currentYM(): YearMonth {
  const d = new Date()
  return formatYM({ year: d.getFullYear(), month: d.getMonth() + 1 })
}

/** Début du mois en années décimales (janvier 2026 → 2026.0). */
export function toDecimalYear(ym: YM): number {
  return ym.year + (ym.month - 1) / 12
}

export interface MonthStep {
  i: number
  year: number
  month: number
  /** Dernier mois de l'année civile ou dernier mois de la simulation. */
  isYearEnd: boolean
  isLast: boolean
}

/** Parcourt les mois de la simulation. */
export function* iterateMonths(start: YM, months: number): Generator<MonthStep> {
  for (let i = 0; i < months; i++) {
    const { year, month } = addMonths(start, i)
    const isLast = i === months - 1
    yield { i, year, month, isLast, isYearEnd: month === 12 || isLast }
  }
}
