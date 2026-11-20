import { computed, reactive, watch } from 'vue'
import { newPerson, type Person } from './person'

/** Clé et version du format enregistré dans le navigateur (SPEC §5.5). */
const STORAGE_KEY = 'simulateur.profils'
const VERSION = 1

interface ProfilesState {
  version: number
  activeId: number | null
  persons: Person[]
}

function readStorage(): { state: ProfilesState | null; available: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: null, available: true }
    const parsed = JSON.parse(raw) as ProfilesState
    if (parsed?.version !== VERSION || !Array.isArray(parsed.persons)) return { state: null, available: true }
    return { state: parsed, available: true }
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
export const profiles = reactive<ProfilesState>(loaded.state ?? { version: VERSION, activeId: null, persons: [] })

/** Faux si le navigateur refuse le stockage (navigation privée, stockage bloqué). */
export const storageAvailable = loaded.available && probeStorage()

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
  profiles.persons.splice(i, 1)
  if (profiles.activeId === id) profiles.activeId = profiles.persons[0]?.id ?? null
}

export function setActive(id: number | null) {
  profiles.activeId = id
}

export function clearAll() {
  profiles.persons.splice(0)
  profiles.activeId = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignoré
  }
}
