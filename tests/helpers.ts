import { getProduct } from '../src/engine/registry'
import type { SimParams } from '../src/engine/types'

/** Paramètres par défaut d'un placement, avec une épargne neutre et un départ en janvier 2026. */
export function params(productId: string, overrides: Partial<Record<string, unknown>> = {}): SimParams {
  return {
    ...getProduct(productId).defaults(),
    start: '2026-01',
    durationYears: 1,
    initialCapital: 0,
    periodicAmount: 0,
    frequency: 'monthly',
    movements: [],
    ...overrides,
  } as SimParams
}

export function simulate(productId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return getProduct(productId).simulate(params(productId, overrides), 'mid')
}
