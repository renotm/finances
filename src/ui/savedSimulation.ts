/**
 * Liaison entre les colonnes affichées et la simulation sauvegardée de l'utilisateur actif (SPEC §5.8).
 * Extrait d'App.vue pour être testé sans navigateur.
 */
import { watch, type Ref } from 'vue'
import { config } from '../config/defaults'
import { cancelSave, flushSave, loadSimulation, scheduleSave } from '../simulations/store'
import { slotsFrom, snapshotOf, type Slot } from './slots'

export interface SavedSimulationBinding {
  /** Colonnes affichées (tableau réactif, modifié sur place). */
  slots: Slot[]
  /** Inflation supposée affichée (%). */
  inflation: Ref<number>
  /** Personne active (null : anonyme). */
  activeId: () => number | null
  /** Vrai si la personne existe encore (une personne supprimée ne doit pas être réenregistrée). */
  personExists: (id: number) => boolean
}

/** Colonnes et inflation initiales de l'utilisateur actif : sa simulation sauvegardée ou les valeurs par défaut. */
export function initialSimulation(personId: number | null): { slots: Slot[]; inflation: number } {
  const saved = loadSimulation(personId)
  return { slots: slotsFrom(saved), inflation: saved?.inflation ?? config.comparison.inflationRate }
}

/**
 * Sauvegarde automatique des colonnes de l'utilisateur actif, et chargement des colonnes de la nouvelle personne
 * quand la personne active change (celles de la précédente restent sauvegardées si elle existe encore).
 */
export function bindSavedSimulation(b: SavedSimulationBinding) {
  let currentUser = b.activeId()
  watch([() => b.slots, b.inflation], () => scheduleSave(currentUser, () => snapshotOf(b.slots, b.inflation.value)), { deep: true })
  watch(b.activeId, (id) => {
    if (id === currentUser) return
    if (currentUser === null || b.personExists(currentUser)) flushSave()
    else cancelSave(currentUser)
    currentUser = id
    const next = initialSimulation(id)
    b.slots.splice(0, b.slots.length, ...next.slots)
    b.inflation.value = next.inflation
  })
}
