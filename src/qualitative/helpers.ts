/** Lecture des paramètres d'une colonne pour adapter les textes qualitatifs (lecture seule). */
import type { SimParams, TaxContext } from '../engine/types'
import type { Text } from './types'

const numberOf = (p: SimParams, key: string): number => {
  const v = p[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Part en unités de compte (%) d'un contrat multisupport. */
export const ucShare = (p: SimParams) => Math.max(0, Math.min(100, 100 - numberOf(p, 'euroShare')))
export const hasUc = (p: SimParams) => ucShare(p) > 0
export const hasEuro = (p: SimParams) => ucShare(p) < 100

/** Couple selon les paramètres de la colonne : situation « couple » (assurance vie) ou contexte fiscal marié / pacsé. */
export function isCouple(p: SimParams): boolean {
  if (p.household === 'couple') return true
  const ctx = p.taxContext as TaxContext | null | undefined
  return !!ctx && ctx.situation === 'married'
}

/** Montant ou taux formaté dans les deux langues. */
export function pctText(v: number): Text {
  return {
    fr: `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v)} %`,
    en: `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(v)}%`,
  }
}
export function eurText(v: number): Text {
  return {
    fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v),
    en: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v),
  }
}

/** Frais saisis dans la colonne (%), pour les citer. */
export const feeOf = (p: SimParams, key: string) => numberOf(p, key)
