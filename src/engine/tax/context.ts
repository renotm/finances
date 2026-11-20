/**
 * Accès au contexte fiscal d'une colonne (SPEC §4.7).
 * Avec un contexte complet, l'impôt est calculé au barème ; sans contexte, on retombe sur une TMI saisie
 * et les résultats sont signalés comme approximatifs (avertissement `taxApproximate`).
 */
import type { SimParams, TaxContext } from '../types'
import { compositionAt, type Composition } from './incomeTax'

export function taxContext(p: SimParams): TaxContext | null {
  const c = p.taxContext as TaxContext | null | undefined
  if (!c || typeof c !== 'object' || !Number.isFinite(Number(c.income))) return null
  return c
}

export function composition(ctx: TaxContext, year: number): Composition {
  return compositionAt({ situation: ctx.situation, children: ctx.children, livesAlone: ctx.livesAlone }, year)
}
