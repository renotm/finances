/** Écarts d'effort d'épargne et d'horizon entre les colonnes comparées (SPEC §3.6). */
import type { SlotResult } from '../engine/run'

export function comparisonDiffs(runs: SlotResult[]) {
  const efforts = runs.map((r) => r.result.summary.totalDeposited - r.result.summary.reinvestedSavings)
  const horizons = runs.map((r) => r.result.summary.horizonMonths)
  return {
    efforts,
    horizons,
    /** Écart de plus d'un euro entre les efforts d'épargne. */
    effortDiffers: runs.length > 1 && Math.max(...efforts) - Math.min(...efforts) > 1,
    horizonDiffers: runs.length > 1 && new Set(horizons).size > 1,
  }
}
