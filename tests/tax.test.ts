/**
 * Moteur fiscal (phase 1). Les résultats attendus sont calculés à la main à partir du barème 2026
 * (revenus 2025), de la décote et du plafonnement du quotient familial (FISCAL_RULES.md §1),
 * sans réutiliser le code de production.
 */
import { describe, expect, it } from 'vitest'
import {
  deductionSaving,
  exceptionalIncomeTax,
  extraTax,
  familyParts,
  incomeTax,
  pensionAllowance,
  taxablePensionIncrement,
} from '../src/engine/tax/incomeTax'
import { migrateProfiles, PROFILES_VERSION } from '../src/profiles/store'

const single = { situation: 'single' as const, children: 0, livesAlone: true }
const couple = { situation: 'married' as const, children: 0, livesAlone: true }

describe('impôt au barème', () => {
  it('célibataire 30 000 € : 11 % puis 30 %, sans décote', () => {
    // (29 579 − 11 600) × 11 % + (30 000 − 29 579) × 30 % = 1 977,69 + 126,30
    const r = incomeTax(30000, single)
    expect(r.grossTax).toBeCloseTo(2103.99, 2)
    expect(r.decote).toBe(0)
    expect(r.tax).toBeCloseTo(2103.99, 2)
  })

  it('décote d\'une personne seule : 897 € − 45,25 % de l\'impôt brut', () => {
    // 20 000 € : impôt brut 8 400 × 11 % = 924 € ; décote 897 − 418,11 = 478,89 €
    const r = incomeTax(20000, single)
    expect(r.grossTax).toBeCloseTo(924, 2)
    expect(r.decote).toBeCloseTo(478.89, 2)
    expect(r.tax).toBeCloseTo(445.11, 2)
  })

  it('décote d\'un couple : 1 483 € − 45,25 % de l\'impôt brut', () => {
    // 40 000 €, 2 parts : 2 × 924 = 1 848 € ; décote 1 483 − 836,22 = 646,78 €
    expect(incomeTax(40000, couple).tax).toBeCloseTo(1201.22, 2)
  })

  it('la décote ne rend jamais l\'impôt négatif', () => {
    // 13 000 € : impôt brut 154 € ; décote calculée 827,32 € ramenée à 154 €
    expect(incomeTax(13000, single).tax).toBe(0)
  })

  it('plafonnement du quotient familial : couple, 2 enfants, 88 000 €', () => {
    // sans plafonnement 5 851,89 € ; sur 2 parts 12 607,98 € ; avantage plafonné à 2 × 1 807 = 3 614 €
    const r = incomeTax(88000, { situation: 'married', children: 2, livesAlone: true })
    expect(r.capped).toBe(true)
    expect(r.tax).toBeCloseTo(12607.98 - 3614, 2)
  })
})

describe('parent isolé ou concubinage', () => {
  it('la demi-part de parent isolé suppose de vivre seul', () => {
    expect(familyParts('single', 1, true)).toBe(2)
    expect(familyParts('single', 1, false)).toBe(1.5)
    expect(familyParts('divorced', 2, false)).toBe(2)
  })

  it('concubinage : 1,5 part, avantage plafonné à 1 807 €', () => {
    // 50 000 € : sur 1,5 part 4 655,99 € ; sur 1 part 8 103,99 € ; écart 3 448 € > 1 807 € → 6 296,99 €
    const r = incomeTax(50000, { situation: 'single', children: 1, livesAlone: false })
    expect(r.parts).toBe(1.5)
    expect(r.tax).toBeCloseTo(6296.99, 2)
  })
})

describe('impôt d\'un revenu supplémentaire et économie d\'une déduction', () => {
  it('économie d\'impôt réelle d\'une déduction qui change de tranche', () => {
    // couple, 70 000 € (quotient 35 000 €) : impôt 2 × 3 603,99 = 7 207,98 €, sans décote
    // après déduction de 20 000 € (quotient 25 000 €) : impôt brut 2 × 1 474 = 2 948 €,
    // décote couple 1 483 − 45,25 % × 2 948 = 149,03 € → impôt 2 798,97 €
    // économie : 7 207,98 − 2 798,97 = 4 409,01 € (l'audit, qui ignorait la décote, donnait 4 259,98 €)
    expect(deductionSaving(70000, 20000, couple)).toBeCloseTo(4409.01, 2)
  })

  it('impôt supplémentaire dans la même tranche = montant × TMI', () => {
    expect(extraTax(50000, 1000, single)).toBeCloseTo(300, 6)
  })

  it('système du quotient pour un revenu exceptionnel', () => {
    // célibataire, 25 000 € (impôt 1 474 − décote 230,01 = 1 243,99 €), exceptionnel 150 000 €
    // direct : 55 550,52 − 1 243,99 = 54 306,53 € ; quotient : 4 × (11 853,99 − 1 243,99) = 42 440,00 €
    const r = exceptionalIncomeTax(25000, 150000, single)
    expect(r.direct).toBeCloseTo(54306.53, 1)
    expect(r.withQuotient).toBeCloseTo(42440.0, 1)
    expect(r.quotientUsed).toBe(true)
    expect(r.tax).toBeCloseTo(42440.0, 1)
  })
})

describe('abattement de 10 % sur les pensions', () => {
  it('10 %, avec plancher par pensionné et plafond par foyer', () => {
    expect(pensionAllowance(30000)).toBeCloseTo(3000, 6)
    expect(pensionAllowance(50000)).toBe(4439)
    expect(pensionAllowance(3000)).toBe(454)
    expect(pensionAllowance(300)).toBe(300)
  })

  it('part imposable d\'une pension supplémentaire quand le plafond est déjà presque atteint', () => {
    // 40 000 € de pensions : abattement 4 000 € ; avec 10 000 € de plus : 4 439 € (plafond)
    // part imposable de la pension ajoutée : 10 000 − 439 = 9 561 €
    expect(taxablePensionIncrement(10000, 40000)).toBeCloseTo(9561, 6)
  })
})

describe('migration des profils enregistrés', () => {
  const v1 = {
    version: 1,
    activeId: 1,
    persons: [{ id: 1, name: 'A', birth: '1986-01', sex: 'male', retirementAge: 64, situation: 'single', children: [], taxableIncome: 30000, tmiManual: false, tmiValue: 30, tmiRetirement: 11, professionalIncome: null, ceilingYear: null, carryN1: 1000, carryN2: null, carryN3: null }],
  }

  it('v1 → v2 : champs existants conservés, nouveaux champs par défaut', () => {
    const s = migrateProfiles(v1)!
    expect(s.version).toBe(PROFILES_VERSION)
    expect(s.activeId).toBe(1)
    expect(s.persons[0]).toMatchObject({ name: 'A', taxableIncome: 30000, carryN1: 1000, livesAlone: true, retirementIncome: null, spouseCeiling: null })
  })

  it('format inconnu ou plus récent : non lu (et donc jamais écrasé)', () => {
    expect(migrateProfiles({ version: PROFILES_VERSION + 1, persons: [] })).toBeNull()
    expect(migrateProfiles({ foo: 1 })).toBeNull()
  })
})
