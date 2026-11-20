/**
 * Sauvegarde des simulations par utilisateur (SPEC §5.8) : les colonnes affichées et l'inflation, pour chaque
 * personne du profil et pour l'anonyme, dans le stockage du navigateur. Sans dépendance aux profils ni à Vue.
 */
import { config } from '../config/defaults'
import { products } from '../engine/registry'
import type { SimParams } from '../engine/types'

const STORAGE_KEY = 'simulateur.simulations'
export const SIMULATIONS_VERSION = 1
export const MAX_COLUMNS = 3
/** Délai de regroupement des sauvegardes pendant la saisie (ms). */
export const SAVE_DELAY = 300

export interface SavedColumn {
  productId: string
  params: SimParams
}
export interface SavedSimulation {
  columns: SavedColumn[]
  inflation: number
}
interface SimulationsState {
  version: number
  users: Record<string, SavedSimulation>
}

/** Clé d'un utilisateur : identifiant de la personne, ou « anonymous » sans personne active. */
export const userKey = (personId: number | null) => (personId === null ? 'anonymous' : String(personId))

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Valide une simulation lue dans le stockage : placements connus seulement, paramètres complétés par les valeurs
 * par défaut du placement (paramètres ajoutés depuis), au plus 3 colonnes, inflation bornée. Null si rien d'utilisable.
 */
export function sanitizeSimulation(raw: unknown): SavedSimulation | null {
  if (!isObject(raw) || !Array.isArray(raw.columns)) return null
  const columns: SavedColumn[] = []
  for (const c of raw.columns) {
    if (columns.length >= MAX_COLUMNS) break
    if (!isObject(c) || typeof c.productId !== 'string' || !isObject(c.params)) continue
    const product = products.find((p) => p.id === c.productId)
    if (!product) continue
    const params = { ...product.defaults(), ...(c.params as SimParams) }
    if (!Array.isArray(params.movements)) params.movements = []
    columns.push({ productId: product.id, params })
  }
  if (columns.length === 0) return null
  const inflation =
    typeof raw.inflation === 'number' && Number.isFinite(raw.inflation)
      ? Math.min(20, Math.max(-5, raw.inflation))
      : config.comparison.inflationRate
  return { columns, inflation }
}

function readState(): SimulationsState {
  const empty: SimulationsState = { version: SIMULATIONS_VERSION, users: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed) || parsed.version !== SIMULATIONS_VERSION || !isObject(parsed.users)) return empty
    return { version: SIMULATIONS_VERSION, users: parsed.users as Record<string, SavedSimulation> }
  } catch {
    return empty
  }
}

function writeState(state: SimulationsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // stockage indisponible ou plein : la simulation reste utilisable le temps de la visite
  }
}

/** Simulation sauvegardée d'un utilisateur, validée, ou null. */
export function loadSimulation(personId: number | null): SavedSimulation | null {
  return sanitizeSimulation(readState().users[userKey(personId)])
}

/** Enregistre immédiatement la simulation d'un utilisateur. */
export function saveSimulation(personId: number | null, sim: SavedSimulation) {
  const state = readState()
  state.users[userKey(personId)] = JSON.parse(JSON.stringify(sim))
  writeState(state)
}

// ---------- Sauvegarde automatique regroupée ----------

let pending: { personId: number | null; snapshot: () => SavedSimulation; timer: ReturnType<typeof setTimeout> } | null = null

/** Programme une sauvegarde après une courte pause ; une nouvelle demande remplace la précédente. */
export function scheduleSave(personId: number | null, snapshot: () => SavedSimulation, delay = SAVE_DELAY) {
  if (pending && userKey(pending.personId) !== userKey(personId)) flushSave()
  if (pending) clearTimeout(pending.timer)
  const timer = setTimeout(flushSave, delay)
  pending = { personId, snapshot, timer }
}

/** Écrit tout de suite la sauvegarde en attente (avant un changement d'utilisateur, par exemple). */
export function flushSave() {
  if (!pending) return
  const { personId, snapshot, timer } = pending
  clearTimeout(timer)
  pending = null
  saveSimulation(personId, snapshot())
}

/** Abandonne la sauvegarde en attente, éventuellement seulement si elle concerne cet utilisateur. */
export function cancelSave(personId?: number | null) {
  if (!pending) return
  if (personId !== undefined && userKey(pending.personId) !== userKey(personId)) return
  clearTimeout(pending.timer)
  pending = null
}

/** Supprime la simulation d'une personne supprimée. */
export function removeSimulation(personId: number | null) {
  cancelSave(personId)
  const state = readState()
  delete state.users[userKey(personId)]
  writeState(state)
}

/** Efface toutes les simulations, anonyme comprise (« Effacer toutes les données »). */
export function clearSimulations() {
  cancelSave()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignoré
  }
}
