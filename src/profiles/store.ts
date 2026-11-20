import { computed, reactive, watch } from 'vue'
import { clearSimulations, removeSimulation } from '../simulations/store'
import { newPerson, upgradePerson, type Person } from './person'

/** Clé et version du format enregistré dans le navigateur (SPEC §5.5). */
const STORAGE_KEY = 'simulateur.profils'
/** v1 : profils initiaux. v2 : contexte fiscal (vit seul, revenus et pensions à la retraite, plafond du conjoint). */
export const PROFILES_VERSION = 2

export interface ProfilesState {
  version: number
  activeId: number | null
  persons: Person[]
}

/**
 * Lit un état enregistré et le met au format courant, sans perte : les champs ajoutés depuis prennent leur
 * valeur par défaut. Renvoie null pour un format inconnu ou plus récent (il n'est alors jamais écrasé).
 */
export function migrateProfiles(parsed: unknown): ProfilesState | null {
  const s = parsed as Partial<ProfilesState> | null
  if (!s || !Array.isArray(s.persons) || typeof s.version !== 'number') return null
  if (s.version > PROFILES_VERSION || s.version < 1) return null
  return {
    version: PROFILES_VERSION,
    activeId: s.activeId ?? null,
    persons: s.persons.filter((p) => p && typeof p.id === 'number').map((p) => upgradePerson(p)),
  }
}

/** Vrai si un état existe dans le navigateur mais n'a pas pu être lu : on ne l'écrase pas. */
let protectExisting = false

function readStorage(): { state: ProfilesState | null; available: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: null, available: true }
    const state = migrateProfiles(JSON.parse(raw))
    if (!state) protectExisting = true
    return { state, available: true }
  } catch {
    return { state: null, available: false }
  }
}

function probeStorage(): boolean {
  try {
    const k = `${STORAGE_KEY}.probe`
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

const loaded = readStorage()

/** Profils enregistrés et personne active, réactifs, sauvegardés automatiquement. */
export const profiles = reactive<ProfilesState>(loaded.state ?? { version: PROFILES_VERSION, activeId: null, persons: [] })

/** Faux si le navigateur refuse le stockage (navigation privée, stockage bloqué) ou si un format illisible est protégé. */
export const storageAvailable = loaded.available && probeStorage() && !protectExisting

// Enregistre tout de suite un état migré, pour que le format courant soit écrit une seule fois.
if (storageAvailable && loaded.state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
  } catch {
    // ignoré
  }
}

watch(
  profiles,
  (state) => {
    if (!storageAvailable) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // stockage plein ou refusé : les profils restent utilisables le temps de la visite
    }
  },
  { deep: true },
)

export const activePerson = computed<Person | null>(
  () => profiles.persons.find((p) => p.id === profiles.activeId) ?? null,
)

function nextId(): number {
  return profiles.persons.reduce((max, p) => Math.max(max, p.id), 0) + 1
}

export function createPerson(name: string): Person {
  const person = newPerson(nextId(), name)
  profiles.persons.push(person)
  if (profiles.activeId === null) profiles.activeId = person.id
  return profiles.persons[profiles.persons.length - 1]
}

export function duplicatePerson(id: number, suffix: string): Person | null {
  const source = profiles.persons.find((p) => p.id === id)
  if (!source) return null
  const copy: Person = JSON.parse(JSON.stringify(source))
  copy.id = nextId()
  copy.name = `${source.name} ${suffix}`
  profiles.persons.push(copy)
  return profiles.persons[profiles.persons.length - 1]
}

export function removePerson(id: number) {
  const i = profiles.persons.findIndex((p) => p.id === id)
  if (i < 0) return
  // Sa simulation sauvegardée disparaît avec elle (SPEC §5.8).
  removeSimulation(id)
  profiles.persons.splice(i, 1)
  if (profiles.activeId === id) profiles.activeId = profiles.persons[0]?.id ?? null
}

export function setActive(id: number | null) {
  profiles.activeId = id
}

export function clearAll() {
  clearSimulations()
  profiles.persons.splice(0)
  profiles.activeId = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignoré
  }
}
