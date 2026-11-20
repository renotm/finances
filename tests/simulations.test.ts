/**
 * Sauvegarde des simulations par utilisateur (SPEC §5.8) : aller-retour, isolation entre personnes et anonyme,
 * changement de personne, cycle de vie (suppression, duplication, effacement), données invalides.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref, type EffectScope } from 'vue'

// Faux stockage du navigateur, installé avant le chargement des modules (le magasin des profils le lit à l'import).
const storage = vi.hoisted(() => {
  const data = new Map<string, string>()
  const fake = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  }
  ;(globalThis as { localStorage?: unknown }).localStorage = fake
  return { data, fake }
})

import { runSimulation } from '../src/engine/run'
import { clearAll, createPerson, duplicatePerson, profiles, removePerson, setActive } from '../src/profiles/store'
import {
  flushSave,
  loadSimulation,
  saveSimulation,
  sanitizeSimulation,
  scheduleSave,
  SIMULATIONS_VERSION,
} from '../src/simulations/store'
import { bindSavedSimulation, initialSimulation } from '../src/ui/savedSimulation'
import { createSlot, snapshotOf, type Slot } from '../src/ui/slots'
import { params } from './helpers'

const KEY = 'simulateur.simulations'
const column = (productId: string, overrides: Record<string, unknown> = {}) => ({ productId, params: params(productId, overrides) })

beforeEach(() => {
  clearAll()
  storage.data.clear()
})
/** Liaisons créées par les tests, arrêtées après chacun pour qu'elles ne réagissent pas aux tests suivants. */
const scopes: EffectScope[] = []
afterEach(() => {
  scopes.splice(0).forEach((s) => s.stop())
  vi.useRealTimers()
})

describe('enregistrement et restauration', () => {
  it('aller-retour : paramètres, mouvements et résultats identiques', () => {
    const per = column('per', {
      currentAge: 45, retirementAge: 64, initialCapital: 5000, periodicAmount: 200, exitMode: 'mixed',
      movements: [{ id: 1, date: '2027-03', amount: 3000, kind: 'deposit' }],
    })
    const av = column('assuranceVie', { initialCapital: 10000, euroShare: 60, ucRate: 5, durationYears: 12 })
    saveSimulation(null, { columns: [per, av], inflation: 2.5 })

    const back = loadSimulation(null)!
    expect(back.inflation).toBe(2.5)
    expect(back.columns.map((c) => c.productId)).toEqual(['per', 'assuranceVie'])
    expect(back.columns[0].params).toEqual(per.params)
    expect(runSimulation('per', back.columns[0].params).result.summary).toEqual(runSimulation('per', per.params).result.summary)
    expect(runSimulation('assuranceVie', back.columns[1].params).result.summary).toEqual(runSimulation('assuranceVie', av.params).result.summary)
  })

  it('isolation entre personnes et anonyme', () => {
    saveSimulation(null, { columns: [column('livretA')], inflation: 1 })
    saveSimulation(1, { columns: [column('per')], inflation: 2 })
    saveSimulation(2, { columns: [column('ldds'), column('livretBancaire')], inflation: 3 })
    expect(loadSimulation(null)!.columns.map((c) => c.productId)).toEqual(['livretA'])
    expect(loadSimulation(1)!.columns.map((c) => c.productId)).toEqual(['per'])
    expect(loadSimulation(2)!.inflation).toBe(3)
    expect(loadSimulation(3)).toBeNull()
  })

  it('sauvegarde regroupée : une seule écriture après la pause de saisie, la dernière valeur', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(storage.fake, 'setItem')
    let inflation = 1
    for (let i = 0; i < 5; i++) {
      inflation = i
      scheduleSave(null, () => ({ columns: [column('livretA')], inflation }))
    }
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(loadSimulation(null)!.inflation).toBe(4)
    spy.mockRestore()
  })
})

describe('restauration tolérante', () => {
  it('données illisibles ou version inconnue : ignorées', () => {
    storage.data.set(KEY, '{pas du json')
    expect(loadSimulation(null)).toBeNull()
    storage.data.set(KEY, JSON.stringify({ version: SIMULATIONS_VERSION + 1, users: { anonymous: { columns: [column('livretA')], inflation: 2 } } }))
    expect(loadSimulation(null)).toBeNull()
    expect(initialSimulation(null).slots.map((s) => s.productId)).toEqual(['livretA', 'assuranceVie'])
  })

  it('placement inconnu retiré, paramètre manquant complété, au plus 3 colonnes, inflation bornée', () => {
    const { baseRate: _omitted, ...withoutRate } = column('livretBancaire').params
    const sim = sanitizeSimulation({
      columns: [{ productId: 'pea', params: {} }, { productId: 'livretBancaire', params: withoutRate }, column('livretA'), column('ldds'), column('per')],
      inflation: 99,
    })!
    expect(sim.columns.map((c) => c.productId)).toEqual(['livretBancaire', 'livretA', 'ldds'])
    expect(sim.columns[0].params.baseRate).toBe(1.5)
    expect(sim.inflation).toBe(20)
  })

  it('aucune colonne utilisable : colonnes par défaut', () => {
    expect(sanitizeSimulation({ columns: [{ productId: 'pea', params: {} }], inflation: 2 })).toBeNull()
    expect(sanitizeSimulation(null)).toBeNull()
  })
})

describe('personne active et cycle de vie', () => {
  /** Reproduit le branchement d'App.vue. */
  function bind() {
    const init = initialSimulation(profiles.activeId)
    const slots = reactive<Slot[]>(init.slots)
    const inflation = ref(init.inflation)
    const scope = effectScope()
    scope.run(() => bindSavedSimulation({ slots, inflation, activeId: () => profiles.activeId, personExists: (id) => profiles.persons.some((p) => p.id === id) }))
    scopes.push(scope)
    return { slots, inflation }
  }
  const ids = (slots: Slot[]) => slots.map((s) => s.productId)

  it('changer de personne : sauvegarde de l\'affichage pour la précédente, chargement de la suivante', async () => {
    const alice = createPerson('Alice')
    const bob = createPerson('Bob')
    setActive(alice.id)
    saveSimulation(bob.id, { columns: [column('per'), column('ldds')], inflation: 3 })
    const view = bind()
    await nextTick()

    view.slots.push(createSlot('livretBancaire'))
    view.inflation.value = 1.5
    await nextTick()

    setActive(bob.id)
    await nextTick()
    expect(ids(view.slots)).toEqual(['per', 'ldds'])
    expect(view.inflation.value).toBe(3)
    expect(loadSimulation(alice.id)!.columns.map((c) => c.productId)).toEqual(['livretA', 'assuranceVie', 'livretBancaire'])
    expect(loadSimulation(alice.id)!.inflation).toBe(1.5)

    setActive(alice.id)
    await nextTick()
    expect(ids(view.slots)).toEqual(['livretA', 'assuranceVie', 'livretBancaire'])
  })

  it('personne sans simulation : colonnes par défaut avec les valeurs de son profil', async () => {
    const alice = createPerson('Alice')
    const carol = createPerson('Carol')
    carol.retirementAge = 62
    setActive(alice.id)
    const view = bind()
    setActive(carol.id)
    await nextTick()
    expect(ids(view.slots)).toEqual(['livretA', 'assuranceVie'])
    view.slots.push(createSlot('per'))
    expect(view.slots[2].params.retirementAge).toBe(62)
  })

  it('anonyme : ses colonnes sont conservées à part', async () => {
    const alice = createPerson('Alice')
    setActive(null)
    const view = bind()
    view.slots.splice(0, view.slots.length, createSlot('ldds'))
    await nextTick()
    setActive(alice.id)
    await nextTick()
    expect(loadSimulation(null)!.columns.map((c) => c.productId)).toEqual(['ldds'])
    setActive(null)
    await nextTick()
    expect(ids(view.slots)).toEqual(['ldds'])
  })

  it('suppression : la simulation disparaît et n\'est pas réenregistrée', async () => {
    const alice = createPerson('Alice')
    const bob = createPerson('Bob')
    setActive(alice.id)
    const view = bind()
    view.slots.push(createSlot('per'))
    await nextTick()
    removePerson(alice.id)
    await nextTick()
    flushSave()
    expect(loadSimulation(alice.id)).toBeNull()
    expect(profiles.activeId).toBe(bob.id)
  })

  it('duplication : la copie commence sans simulation', () => {
    const alice = createPerson('Alice')
    saveSimulation(alice.id, { columns: [column('per')], inflation: 2 })
    const copy = duplicatePerson(alice.id, '(copie)')!
    expect(loadSimulation(copy.id)).toBeNull()
  })

  it('« Effacer toutes les données » : toutes les simulations, anonyme comprise', () => {
    const alice = createPerson('Alice')
    saveSimulation(alice.id, { columns: [column('per')], inflation: 2 })
    saveSimulation(null, { columns: [column('livretA')], inflation: 2 })
    clearAll()
    expect(storage.data.has(KEY)).toBe(false)
    expect(loadSimulation(null)).toBeNull()
  })

  it('instantané sérialisable, indépendant des colonnes affichées', () => {
    const slots = [createSlot('livretA')]
    const snap = snapshotOf(slots, 2)
    slots[0].params.initialCapital = 999999
    expect(snap.columns[0].params.initialCapital).not.toBe(999999)
  })
})

describe('stockage indisponible', () => {
  it('les lectures et écritures échouent sans erreur', () => {
    const get = vi.spyOn(storage.fake, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const set = vi.spyOn(storage.fake, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => saveSimulation(null, { columns: [column('livretA')], inflation: 2 })).not.toThrow()
    expect(loadSimulation(null)).toBeNull()
    expect(initialSimulation(null).slots).toHaveLength(2)
    get.mockRestore()
    set.mockRestore()
  })
})
