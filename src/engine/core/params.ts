import type { SimParams } from '../types'

export function num(p: SimParams, key: string): number {
  const v = Number(p[key])
  return Number.isFinite(v) ? v : 0
}

/** Montant positif ou nul. */
export function amount(p: SimParams, key: string): number {
  return Math.max(0, num(p, key))
}

/** Pourcentage converti en décimal (1.7 → 0.017). */
export function pct(p: SimParams, key: string): number {
  return num(p, key) / 100
}

export function str(p: SimParams, key: string): string {
  const v = p[key]
  return typeof v === 'string' ? v : String(v ?? '')
}

export function bool(p: SimParams, key: string): boolean {
  return p[key] === true || p[key] === 'true'
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Durée de simulation en mois (entre 1 mois et 60 ans). */
export function durationMonths(years: number): number {
  return clamp(Math.round(years * 12), 1, 720)
}
