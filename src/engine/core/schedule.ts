import type { SimParams } from '../types'
import { monthsBetween, parseYM } from './dates'
import { amount, str } from './params'

/** Montants à verser / retirer pour chaque mois de la simulation (index 0 = premier mois). */
export interface Schedule {
  deposits: number[]
  /** Part des versements du mois qui vient du versement périodique (incluse dans `deposits`). */
  regular: number[]
  withdrawals: number[]
  earlyReleases: number[]
  /** Déblocages anticipés du PER pour accident de la vie (fiscalité différente). */
  accidentReleases: number[]
  /** Nombre de mouvements ponctuels hors de la période simulée (ignorés). */
  outOfRange: number
}

/**
 * Versements périodiques (le 1er du mois ; en annuel, le 1er mois puis tous les 12 mois)
 * et mouvements ponctuels. Le capital initial n'en fait pas partie.
 */
export function buildSchedule(p: SimParams, months: number): Schedule {
  const zeros = () => new Array<number>(months).fill(0)
  const s: Schedule = { deposits: zeros(), regular: zeros(), withdrawals: zeros(), earlyReleases: zeros(), accidentReleases: zeros(), outOfRange: 0 }
  const start = parseYM(str(p, 'start'))
  const periodic = amount(p, 'periodicAmount')
  const yearly = str(p, 'frequency') === 'yearly'

  if (periodic > 0) {
    for (let i = 0; i < months; i++) {
      if (!yearly || i % 12 === 0) {
        s.deposits[i] += periodic
        s.regular[i] += periodic
      }
    }
  }

  for (const m of p.movements ?? []) {
    const value = Math.max(0, Number(m.amount) || 0)
    if (value === 0) continue
    const i = monthsBetween(start, parseYM(m.date))
    if (i < 0 || i >= months) {
      s.outOfRange++
      continue
    }
    if (m.kind === 'deposit') s.deposits[i] += value
    else if (m.kind === 'withdrawal') s.withdrawals[i] += value
    else if (m.kind === 'earlyReleaseAccident') s.accidentReleases[i] += value
    else s.earlyReleases[i] += value
  }
  return s
}
