import { getProduct } from './registry'
import type { Point, SimParams, SimResult } from './types'

export interface SlotResult {
  result: SimResult
  /** Fourchette basse / haute des supports risqués. */
  band?: { low: Point[]; high: Point[] }
}

/** Simule un placement au taux moyen, plus les scénarios bas et haut s'il contient des supports risqués. */
export function runSimulation(productId: string, params: SimParams): SlotResult {
  const product = getProduct(productId)
  const result = product.simulate(params, 'mid')
  if (!product.hasRisk(params)) return { result }
  return {
    result,
    band: {
      low: product.simulate(params, 'low').points,
      high: product.simulate(params, 'high').points,
    },
  }
}
