import { getProduct } from '../engine/registry'
import { SHARED_KEYS } from '../engine/products/common'
import type { SimParams } from '../engine/types'
import { profilePatch } from '../profiles/apply'
import { activePerson } from '../profiles/store'
import { MAX_COLUMNS, type SavedSimulation } from '../simulations/store'

/** Une colonne de comparaison : un type de placement et ses paramètres. */
export interface Slot {
  id: number
  productId: string
  params: SimParams
}

export const MAX_SLOTS = MAX_COLUMNS
let nextId = 1

/** Colonnes affichées par défaut (Livret A, assurance vie), avec les valeurs de la personne active. */
export function defaultSlots(): Slot[] {
  return [createSlot('livretA'), createSlot('assuranceVie')]
}

/** Colonnes d'une simulation sauvegardée (SPEC §5.8), ou colonnes par défaut s'il n'y en a pas. */
export function slotsFrom(saved: SavedSimulation | null): Slot[] {
  if (!saved) return defaultSlots()
  return saved.columns.map((c) => ({ id: nextId++, productId: c.productId, params: c.params }))
}

/** Instantané sérialisable des colonnes et de l'inflation, pour la sauvegarde. */
export function snapshotOf(slots: Slot[], inflation: number): SavedSimulation {
  return { columns: slots.map((s) => ({ productId: s.productId, params: JSON.parse(JSON.stringify(s.params)) })), inflation }
}

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
