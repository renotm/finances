/**
 * Cas limites (phase 6) : bornes des seuils, changements d'année et d'âge, retraits totaux, rendements nuls ou
 * négatifs, frais supérieurs au rendement, simulations longues, saisies incohérentes.
 * Attendus calculés indépendamment du code de production.
 */
import { describe, expect, it } from 'vitest'
import { annuityTaxableFraction } from '../src/engine/products/per'
import { computeTmi, incomeTax } from '../src/engine/tax/incomeTax'
import { simulate } from './helpers'

describe('bornes du barème', () => {
  const single = { situation: 'single' as const, children: 0, livesAlone: true }

  it('11 600 € : aucun impôt ; un euro de plus : 0,11 € d\'impôt brut, effacé par la décote', () => {
    expect(incomeTax(11600, single).grossTax).toBe(0)
    expect(incomeTax(11601, single).grossTax).toBeCloseTo(0.11, 9)
    expect(incomeTax(11601, single).tax).toBe(0)
  })

  it('tranche à la borne exacte : 29 579 € → 11 %, 29 580 € → 30 %', () => {
    expect(computeTmi('single', 0, 29579).tmi).toBe(11)
    expect(computeTmi('single', 0, 29580).tmi).toBe(30)
  })
})

describe('changements d\'année et d\'âge', () => {
  it('assurance vie : le régime après 8 ans s\'applique au mois anniversaire', () => {
    // contrat ouvert en mars 2018, valeur 10 000 €, primes 5 000 € ; rachat de 2 000 € (1 000 € de produits)
    const common = { euroShare: 0, ucRate: 0, ucFee: 0, initialCapital: 10000, existingContract: true, openingDate: '2018-03', existingPremiums: 5000 }
    const feb = simulate('assuranceVie', { ...common, movements: [{ id: 1, date: '2026-02', amount: 2000, kind: 'withdrawal' }] })
    const mar = simulate('assuranceVie', { ...common, movements: [{ id: 1, date: '2026-03', amount: 2000, kind: 'withdrawal' }] })
    // février : 7 ans et 11 mois → 12,8 % + 17,2 % ; mars : 8 ans → abattement, 17,2 % seulement
    expect(feb.years[0].withdrawals).toBe(2000)
    expect(feb.flows.net.find((x) => x.i === 1)!.amount).toBeCloseTo(2000 - 128 - 172, 6)
    expect(mar.flows.net.find((x) => x.i === 2)!.amount).toBeCloseTo(2000 - 172, 6)
  })

  it('fraction imposable des rentes aux bornes d\'âge', () => {
    expect(annuityTaxableFraction(49.99)).toBe(0.7)
    expect(annuityTaxableFraction(50)).toBe(0.5)
    expect(annuityTaxableFraction(59.99)).toBe(0.5)
    expect(annuityTaxableFraction(60)).toBe(0.4)
  })

  it('PER : les versements cessent d\'être déductibles le mois des 70 ans', () => {
    // 69 ans en janvier 2026 : 12 versements de 100 € déductibles en 2026 ; plus aucun en 2027
    const r = simulate('per', { currentAge: 69, retirementAge: 71, periodicAmount: 100, euroRate: 0.6, euroFee: 0.6, tmiNow: 30 })
    expect(r.years[0].taxSavings).toBeCloseTo(1200 * 0.3, 6)
    expect(r.years[1].taxSavings).toBe(0)
    expect(r.warnings.map((w) => w.code)).toContain('perAgeLimit')
  })
})

describe('retraits totaux', () => {
  it('livret : retrait de tout le solde, plus d\'intérêts ensuite', () => {
    // 1 200 € de janvier à juin (12 quinzaines), retrait total le 1er juillet
    const r = simulate('livretA', { initialCapital: 1200, rate: 1.7, movements: [{ id: 1, date: '2026-07', amount: 1200, kind: 'withdrawal' }] })
    expect(r.summary.gains).toBeCloseTo(Math.round(((1200 * 0.017) / 24) * 12 * 100) / 100, 6)
    expect(r.summary.finalGross).toBeCloseTo(10.2, 6)
  })

  it('assurance vie : rachat total, puis nouveaux versements', () => {
    const r = simulate('assuranceVie', {
      euroShare: 0, ucRate: 0, ucFee: 0, initialCapital: 5000, durationYears: 2,
      movements: [{ id: 1, date: '2026-06', amount: 5000, kind: 'withdrawal' }, { id: 2, date: '2027-01', amount: 1000, kind: 'deposit' }],
    })
    expect(r.summary.totalWithdrawn).toBe(5000)
    expect(r.summary.finalGross).toBeCloseTo(1000, 6)
  })
})

describe('rendements nuls ou négatifs, frais supérieurs au rendement', () => {
  it('unités de compte à −5 % : perte sans impôt ni prélèvements sociaux, TRI de −5 %', () => {
    const r = simulate('assuranceVie', { euroShare: 0, ucRate: -5, ucFee: 0, initialCapital: 10000 })
    expect(r.summary.finalGross).toBeCloseTo(9500, 6)
    expect(r.summary.finalNet).toBeCloseTo(9500, 6)
    expect(r.summary.annualReturnNet!).toBeCloseTo(-0.05, 6)
  })

  it('livret à taux nul : aucun intérêt', () => {
    const r = simulate('livretA', { initialCapital: 1000, rate: 0, durationYears: 3 })
    expect(r.summary.gains).toBe(0)
    expect(r.summary.finalGross).toBe(1000)
  })

  it('fonds euros dont les frais dépassent le rendement : capital qui baisse, aucun prélèvement', () => {
    // 1 000 € × (0,2 % − 0,8 %) = −6 €
    const r = simulate('assuranceVie', { euroShare: 100, euroRate: 0.2, euroFee: 0.8, initialCapital: 1000 })
    expect(r.summary.finalGross).toBeCloseTo(994, 6)
    expect(r.summary.taxes).toBe(0)
  })
})

describe('simulations longues', () => {
  it('Livret A sur 60 ans : capitalisation annuelle arrondie au centime (calcul indépendant)', () => {
    let b = 1000
    for (let y = 0; y < 60; y++) b += Math.round(b * 0.017 * 100) / 100
    const r = simulate('livretA', { initialCapital: 1000, rate: 1.7, durationYears: 60 })
    expect(r.summary.finalGross).toBeCloseTo(b, 6)
  })

  it('PER de 30 à 80 ans en rente : valeurs finies, TRI pertinent', () => {
    const r = simulate('per', { currentAge: 30, retirementAge: 64, periodicAmount: 200, exitMode: 'annuity', endAge: 95, euroShare: 50 })
    expect(Number.isFinite(r.summary.finalNet)).toBe(true)
    expect(r.summary.annualReturnNetStatus).toBe('ok')
  })
})

describe('saisies incohérentes', () => {
  it('montants négatifs ramenés à zéro', () => {
    const r = simulate('livretA', { initialCapital: -500, periodicAmount: -50 })
    expect(r.summary.totalDeposited).toBe(0)
  })

  it('durée excessive plafonnée à 60 ans', () => {
    const r = simulate('livretA', { initialCapital: 100, durationYears: 500 })
    expect(r.summary.horizonMonths).toBe(720)
  })

  it('date de début illisible : pas d\'erreur', () => {
    expect(() => simulate('livretA', { start: 'n/a', initialCapital: 100 })).not.toThrow()
  })

  it('part en fonds euros hors bornes : ramenée entre 0 et 100 %', () => {
    const r = simulate('assuranceVie', { euroShare: 150, euroRate: 3.2, euroFee: 0.6, initialCapital: 1000 })
    expect(r.summary.finalGross).toBeCloseTo(1000 + 26 - 26 * 0.172, 6)
  })
})
