import { config } from '../../config/defaults'
import { currentYM } from '../core/dates'
import type { ParamDef, SimParams } from '../types'

/** Paramètres d'épargne communs à tous les placements. */
export function savingsParams(opts: { withDuration: boolean }): ParamDef[] {
  const defs: ParamDef[] = [{ key: 'start', type: 'yearMonth', group: 'main' }]
  if (opts.withDuration) {
    defs.push({ key: 'durationYears', type: 'number', unit: 'years', min: 1, max: 60, step: 1, group: 'main' })
  }
  defs.push(
    { key: 'initialCapital', type: 'number', unit: 'eur', min: 0, step: 100, group: 'main' },
    { key: 'periodicAmount', type: 'number', unit: 'eur', min: 0, step: 10, group: 'main' },
    { key: 'frequency', type: 'select', options: ['monthly', 'yearly'], group: 'main' },
  )
  return defs
}

export function savingsDefaults(): SimParams {
  return {
    start: currentYM(),
    durationYears: config.simulation.durationYears,
    initialCapital: config.simulation.initialCapital,
    periodicAmount: config.simulation.periodicAmount,
    frequency: 'monthly',
    movements: [],
  }
}

/** Clés conservées quand on change de type de placement dans une colonne. */
export const SHARED_KEYS = ['start', 'durationYears', 'initialCapital', 'periodicAmount', 'frequency'] as const

export const pctParam = (key: string, group: 'main' | 'advanced', max = 100, step = 0.1): ParamDef => ({
  key,
  type: 'number',
  unit: 'pct',
  min: 0,
  max,
  step,
  group,
})
