import { getProduct } from '../engine/registry'
import { SHARED_KEYS } from '../engine/products/common'
import type { SimParams } from '../engine/types'
import { profilePatch } from '../profiles/apply'
import { activePerson } from '../profiles/store'

/** Une colonne de comparaison : un type de placement et ses paramètres. */
export interface Slot {
  id: number
  productId: string
  params: SimParams
}

export const MAX_SLOTS = 3
let nextId = 1

/** Valeurs par défaut d'un placement, complétées par la personne active s'il y en a une (SPEC §5.5). */
function defaultsFor(productId: string): SimParams {
  const params = getProduct(productId).defaults()
  const person = activePerson.value
  return person ? { ...params, ...profilePatch(person, productId, params) } : params
}

export function createSlot(productId: string): Slot {
  return { id: nextId++, productId, params: defaultsFor(productId) }
}

/** Change le type de placement en conservant les paramètres d'épargne communs. */
export function switchProduct(slot: Slot, productId: string) {
  const params = getProduct(productId).defaults()
  for (const key of SHARED_KEYS) {
    if (key in slot.params && key in params) params[key] = slot.params[key]
  }
  // Le profil est appliqué après, pour que l'âge soit calculé à la date de début conservée.
  const person = activePerson.value
  if (person) Object.assign(params, profilePatch(person, productId, params))
  slot.productId = productId
  slot.params = params
}

export function resetSlot(slot: Slot) {
  slot.params = defaultsFor(slot.productId)
}

/** Reprend volontairement les valeurs de la personne active dans une colonne déjà ouverte. */
export function applyProfile(slot: Slot) {
  const person = activePerson.value
  if (person) Object.assign(slot.params, profilePatch(person, slot.productId, slot.params))
}
