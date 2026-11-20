import { getProduct } from '../engine/registry'
import { SHARED_KEYS } from '../engine/products/common'
import type { SimParams } from '../engine/types'

/** Une colonne de comparaison : un type de placement et ses paramètres. */
export interface Slot {
  id: number
  productId: string
  params: SimParams
}

export const MAX_SLOTS = 3
let nextId = 1

export function createSlot(productId: string): Slot {
  return { id: nextId++, productId, params: getProduct(productId).defaults() }
}

/** Change le type de placement en conservant les paramètres d'épargne communs. */
export function switchProduct(slot: Slot, productId: string) {
  const params = getProduct(productId).defaults()
  for (const key of SHARED_KEYS) {
    if (key in slot.params && key in params) params[key] = slot.params[key]
  }
  slot.productId = productId
  slot.params = params
}

export function resetSlot(slot: Slot) {
  slot.params = getProduct(slot.productId).defaults()
}
