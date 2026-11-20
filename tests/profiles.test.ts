import { describe, expect, it } from 'vitest'
import {
  childrenInCharge,
  computeTmi,
  familyParts,
  isChildInCharge,
  tmiForYear,
  tmiSchedule,
  type Child,
} from '../src/engine/tax/incomeTax'
import { profilePatch } from '../src/profiles/apply'
import { newPerson } from '../src/profiles/person'
import { params, simulate } from './helpers'

const child = (birth: string, attachment: Child['attachment'] = 'none', disabled = false): Child => ({
  id: Math.random(),
  birth,
  attachment,
  disabled,
})

describe('nombre de parts', () => {
  it('parts de base, enfants, parent isolé', () => {
    expect(familyParts('single', 0)).toBe(1)
    expect(familyParts('married', 0)).toBe(2)
    expect(familyParts('married', 2)).toBe(3)
    expect(familyParts('married', 3)).toBe(4) // le 3e enfant compte pour une part entière
    expect(familyParts('single', 1)).toBe(2) // 1 + 0,5 + 0,5 (parent isolé)
    expect(familyParts('widowed', 1)).toBe(2.5) // veuf avec enfant : 2 parts de base
  })
})

describe('enfants à charge selon l\'âge', () => {
  it('mineur au 1er janvier, puis rattaché jusqu\'à 21 ou 25 ans, sans limite si invalide', () => {
    const c = child('2010-06') // 15 ans au 1er janvier 2026
    expect(isChildInCharge(c, 2028)).toBe(true)
    expect(isChildInCharge(c, 2029)).toBe(false)
    expect(isChildInCharge({ ...c, attachment: '21' }, 2031)).toBe(true)
    expect(isChildInCharge({ ...c, attachment: '21' }, 2032)).toBe(false)
    expect(isChildInCharge({ ...c, attachment: '25' }, 2035)).toBe(true)
    expect(isChildInCharge({ ...c, attachment: '25' }, 2036)).toBe(false)
    expect(isChildInCharge({ ...c, disabled: true }, 2080)).toBe(true)
  })

  it('un enfant né dans l\'année compte, pas avant sa naissance', () => {
    const c = child('2027-10')
    expect(isChildInCharge(c, 2026)).toBe(false)
    expect(isChildInCharge(c, 2027)).toBe(true)
  })
})

describe('TMI', () => {
  it('tranche du quotient familial', () => {
    expect(computeTmi('single', 0, 29000).tmi).toBe(11)
    expect(computeTmi('single', 0, 30000).tmi).toBe(30)
    expect(computeTmi('married', 2, 60000)).toMatchObject({ tmi: 11, parts: 3, quotient: 20000, capped: false })
  })

  it('plafonnement du quotient familial : la TMI suit les parts de base', () => {
    // Couple, 2 enfants, 88 000 € : quotient de 29 333 € (11 %) sans plafonnement ;
    // l'avantage des enfants (6 756 €) dépasse 2 × 1 807 € : TMI calculée sur 2 parts (44 000 €, 30 %)
    expect(computeTmi('married', 2, 88000)).toMatchObject({ tmi: 30, capped: true, quotient: 44000 })
  })

  it('parent isolé : plafond de 4 262 € pour la part du premier enfant', () => {
    // 50 000 €, 2 parts : 11 % sans plafonnement ; avantage de 5 156 € > 4 262 € : 30 %
    expect(computeTmi('single', 1, 50000)).toMatchObject({ tmi: 30, capped: true })
  })

  it('calendrier : la TMI monte quand les enfants quittent le foyer', () => {
    const steps = tmiSchedule(
      { situation: 'married', children: [child('2010-06'), child('2012-03')], income: 60000 },
      2026,
      2040,
    )
    expect(steps).toEqual([
      { fromYear: 2026, tmi: 11, parts: 3 },
      { fromYear: 2029, tmi: 11, parts: 2.5 },
      { fromYear: 2031, tmi: 30, parts: 2 },
    ])
    expect(tmiForYear(steps, 2030)).toBe(11)
    expect(tmiForYear(steps, 2031)).toBe(30)
    expect(childrenInCharge([child('2010-06'), child('2012-03')], 2029)).toBe(1)
  })
})

describe('TMI année par année dans les placements', () => {
  const schedule = [
    { fromYear: 2026, tmi: 11, parts: 3 },
    { fromYear: 2027, tmi: 30, parts: 2 },
  ]

  it('PER : économie d\'impôt avec la TMI de chaque année', () => {
    const r = simulate('per', {
      currentAge: 40,
      retirementAge: 43,
      euroRate: 0.6,
      tmiNow: 'profile',
      tmiSchedule: schedule,
      movements: [
        { id: 1, date: '2026-01', amount: 1000, kind: 'deposit' },
        { id: 2, date: '2027-01', amount: 1000, kind: 'deposit' },
        { id: 3, date: '2028-01', amount: 1000, kind: 'deposit' },
      ],
    })
    expect(r.years.map((y) => y.taxSavings)).toEqual([110, 300, 300].map((v) => expect.closeTo(v, 6)))
    expect(r.years.map((y) => y.tmi)).toEqual([11, 30, 30])
  })

  it('livret bancaire au barème : impôt avec la TMI de chaque année', () => {
    const r = simulate('livretBancaire', {
      initialCapital: 10000,
      baseRate: 1.5,
      durationYears: 2,
      taxMode: 'bareme',
      tmi: 'profile',
      tmiSchedule: schedule,
    })
    // 2026 à 11 % : impôt 150 × 11 % moins la CSG déductible (10,20 € × 11 %), plus 27,90 € de prélèvements sociaux
    expect(r.years[0].taxes).toBeCloseTo(27.9 + 150 * 0.11 - 10.2 * 0.11, 2)
    expect(r.years[1].tmi).toBe(30)
  })

  it('une TMI fixe ignore le calendrier', () => {
    const r = simulate('per', { currentAge: 40, retirementAge: 41, initialCapital: 1000, euroRate: 0.6, tmiNow: 41, tmiSchedule: schedule })
    expect(r.summary.taxSavings).toBeCloseTo(410, 6)
  })
})

describe('application d\'un profil à une colonne', () => {
  const family = () => ({
    ...newPerson(1, 'Test'),
    birth: '1986-01',
    sex: 'female' as const,
    retirementAge: 65,
    situation: 'married' as const,
    children: [child('2010-06'), child('2012-03')],
    taxableIncome: 60000,
    professionalIncome: 40000,
    carryN1: 3000,
  })

  it('PER : âge, TMI selon le profil, revenus, report, âge de fin selon le sexe', () => {
    const p = params('per', { start: '2026-01' })
    const patch = profilePatch(family(), 'per', p)
    expect(patch).toMatchObject({
      currentAge: 40,
      retirementAge: 65,
      tmiNow: 'profile',
      income: 40000,
      carryN1: 3000,
      endAge: 89,
    })
    expect(patch.tmiSchedule).toHaveLength(3)
    expect(patch).not.toHaveProperty('ceilingOverride') // non renseigné : la valeur par défaut est gardée
  })

  it('TMI constante : taux fixe plutôt que « Selon le profil »', () => {
    const patch = profilePatch({ ...family(), children: [] }, 'per', params('per', { start: '2026-01' }))
    expect(patch.tmiNow).toBe(30)
    expect(patch.tmiSchedule).toEqual([])
  })

  it('TMI saisie à la main : taux fixe', () => {
    const patch = profilePatch({ ...family(), tmiManual: true, tmiValue: 41 }, 'per', params('per'))
    expect(patch.tmiNow).toBe(41)
  })

  it('assurance vie : abattement de couple si marié ou pacsé', () => {
    expect(profilePatch(family(), 'assuranceVie', params('assuranceVie')).household).toBe('couple')
    expect(profilePatch({ ...family(), situation: 'divorced' }, 'assuranceVie', params('assuranceVie')).household).toBe('single')
  })

  it('livret réglementé : rien à reprendre', () => {
    expect(profilePatch(family(), 'livretA', params('livretA'))).toEqual({})
  })
})
