/**
 * Corrections ciblées (AUDIT_FINAL_FIX.md). Attendus calculés à la main, indépendamment du code de production.
 */
import { describe, expect, it } from 'vitest'
import { fiscal } from '../src/config/fiscal'
import { irrAnalysis } from '../src/engine/core/irr'
import { householdPensionAllowance, pensionAllowance, taxablePensionIncrement } from '../src/engine/tax/incomeTax'
import fr from '../src/i18n/fr'
import { simulate } from './helpers'

describe('1. PER : déblocage anticipé l\'année du versement', () => {
  // 5 000 € versés en mars 2026, plafond 4 710 €, rendement net nul, TMI 30 % puis 11 % à la retraite (42 ans)
  const base = { currentAge: 40, retirementAge: 42, euroShare: 100, euroRate: 0.6, euroFee: 0.6, tmiNow: 30, tmiRetirement: 11 }
  const deposit = { id: 1, date: '2026-03', amount: 5000, kind: 'deposit' as const }

  it('résidence principale : la part déductible des versements de l\'année est imposée au retrait', () => {
    const r = simulate('per', { ...base, movements: [deposit, { id: 2, date: '2026-06', amount: 2500, kind: 'earlyRelease' }] })
    // 4 710 € seront déduits sur 5 000 € ; la moitié sort : 2 355 € de versements déduits imposés à 30 % = 706,50 €
    expect(r.years[0].taxes).toBeCloseTo(706.5, 6)
    expect(r.flows.net.find((x) => x.i === 5)!.amount).toBeCloseTo(2500 - 706.5, 6)
    // La déduction de l'année porte toujours sur 4 710 € versés
    expect(r.years[0].taxSavings).toBeCloseTo(4710 * 0.3, 6)
    // À la retraite : 2 355 € de versements déduits restants imposés à 11 %
    expect(r.summary.taxes).toBeCloseTo(706.5 + 2355 * 0.11, 6)
    expect(r.summary.finalNet).toBeCloseTo(2500 - 2355 * 0.11 + 1413, 6)
  })

  it('accident de la vie : exonéré d\'impôt sur le revenu, même pour des versements déduits', () => {
    const r = simulate('per', { ...base, movements: [deposit, { id: 2, date: '2026-06', amount: 2500, kind: 'earlyReleaseAccident' }] })
    expect(r.years[0].taxes).toBe(0)
    expect(r.years[0].taxSavings).toBeCloseTo(1413, 6)
  })

  it('aucun plafond disponible : les versements ne seront pas déduits, le retrait n\'est pas imposé', () => {
    const r = simulate('per', {
      ...base, ceilingManual: true, ceilingOverride: 0,
      movements: [deposit, { id: 2, date: '2026-06', amount: 2500, kind: 'earlyRelease' }],
    })
    expect(r.years[0].taxes).toBe(0)
    expect(r.summary.taxSavings).toBe(0)
  })

  it('avec le contexte fiscal : barème avec système du quotient sur la part déduite', () => {
    // célibataire, 50 000 € (quotient dans la tranche à 30 %) : 2 355 € imposés à 30 %, directement ou au quotient
    const r = simulate('per', {
      ...base,
      taxContext: { situation: 'single', children: [], livesAlone: true, income: 50000, retirementIncome: null, retirementPensions: null },
      movements: [deposit, { id: 2, date: '2026-06', amount: 2500, kind: 'earlyRelease' }],
    })
    expect(r.years[0].taxes).toBeCloseTo(706.5, 6)
  })
})

describe('2. Assurance vie : rachat partiel d\'un contrat en perte (BOFiP BOI-RPPM-RCM-20-10-20-50 §100)', () => {
  // Contrat de plus de 8 ans : valeur 8 000 €, primes 10 000 € (en perte), UC à +60 % ensuite, sans frais
  const common = {
    euroShare: 0, ucRate: 60, ucFee: 0, initialCapital: 8000, existingContract: true, openingDate: '2010-01', existingPremiums: 10000,
    movements: [{ id: 1, date: '2026-01', amount: 4000, kind: 'withdrawal' as const }],
  }

  it('produit nul, aucun impôt au rachat', () => {
    const r = simulate('assuranceVie', common)
    expect(r.flows.net.find((x) => x.i === 0 && x.amount > 0)!.amount).toBeCloseTo(4000, 6)
  })

  it('primes restantes réduites du seul montant racheté (6 000 €, et non 5 000 €)', () => {
    // valeur après rachat 4 000 € → 6 400 € ; produits au rachat total = 6 400 − 6 000 = 400 €,
    // couverts par l'abattement ; prélèvements sociaux 400 × 17,2 % = 68,80 €
    const r = simulate('assuranceVie', common)
    expect(r.summary.finalGross).toBeCloseTo(6400, 6)
    expect(r.summary.finalNet).toBeCloseTo(6400 - 68.8, 6)
  })

  it('contrat en plus-value : règle générale primes × rachat ÷ valeur', () => {
    // valeur 12 000 €, primes 10 000 €, rachat 6 000 € : produits 1 000 €, primes restantes 5 000 €
    const r = simulate('assuranceVie', { ...common, ucRate: 0, initialCapital: 12000, movements: [{ id: 1, date: '2026-01', amount: 6000, kind: 'withdrawal' }] })
    // produits au rachat total : 6 000 − 5 000 = 1 000 € ; 1 000 + 1 000 sous l'abattement annuel de 4 600 € ;
    // prélèvements sociaux 1 000 × 17,2 % à chaque rachat
    expect(r.summary.finalNet).toBeCloseTo(6000 - 172, 6)
  })
})

describe('3. Abattement sur les pensions quand les deux conjoints sont pensionnés', () => {
  it('plancher par pensionné, plafond par foyer', () => {
    // 2 000 € : plancher 454 € ; 40 000 € : 4 000 € ; total 4 454 € plafonné à 4 439 €
    expect(householdPensionAllowance([2000, 40000])).toBe(4439)
    // 1 000 € : 454 € ; 20 000 € : 2 000 €
    expect(householdPensionAllowance([1000, 20000])).toBe(2454)
    // une seule pension : identique au calcul simple
    expect(householdPensionAllowance([30000])).toBeCloseTo(pensionAllowance(30000), 9)
  })

  it('rente ajoutée à la petite pension du titulaire : le plancher ne lui donne aucun abattement supplémentaire', () => {
    // titulaire 1 000 € (+ 2 000 € de rente → 3 000 €, abattement toujours 454 €), conjoint 20 000 €
    expect(taxablePensionIncrement(2000, 1000, [20000])).toBeCloseTo(2000, 9)
    // un calcul sur les pensions agrégées du foyer (21 000 → 23 000 €) aurait donné 1 800 €
    expect(23000 - pensionAllowance(23000) - (21000 - pensionAllowance(21000))).toBeCloseTo(1800, 9)
  })

  it('PER : la rente du titulaire est imposée sans abattement supplémentaire', () => {
    const gross = (10000 / 31.7745) * 0.98
    const r = simulate('per', {
      currentAge: 63, retirementAge: 64, initialCapital: 10000, euroShare: 100, euroRate: 0.6, euroFee: 0.6, ceilingOverride: 10000,
      exitMode: 'annuity', annuityMethod: 'table', tableGuaranteed: true, arrearsFee: 2,
      taxContext: { situation: 'married', children: [], livesAlone: true, income: 60000, retirementIncome: 60000, retirementPensions: 21000, retirementPensionsSpouse: 20000 },
    })
    // couple, 60 000 € : quotient 30 000 € → 30 % ; prélèvements sociaux sur 40 % (64 ans)
    expect(r.annuity!.netYearly).toBeCloseTo(gross - gross * 0.3 - gross * 0.4 * 0.186, 6)
  })
})

describe('4. TRI multiples : résolution de la détection', () => {
  // valeur actuelle −x1·x2 + (x1 + x2)·x − x² (x = 1 / (1 + r)), nulle pour deux taux mensuels r1 et r2
  const flows = (r1: number, r2: number) => {
    const x1 = 1 / (1 + r1)
    const x2 = 1 / (1 + r2)
    return [{ i: 0, amount: -1000 * x1 * x2 }, { i: 1, amount: 1000 * (x1 + x2) }, { i: 2, amount: -1000 }]
  }

  it('deux TRI distants de 0,08 point par mois dans la plage réaliste : détectés', () => {
    expect(irrAnalysis(flows(0.0101, 0.0109)).status).toBe('multiple')
  })

  it('limite documentée : deux TRI plus proches que le pas fin (0,01 point par mois) ne sont pas détectés', () => {
    expect(irrAnalysis(flows(0.01002, 0.01008)).status).toBe('none')
  })

  it('hors de la plage fine, le pas est de 0,25 point par mois : deux TRI à 0,1 point d\'écart ne sont pas détectés', () => {
    expect(irrAnalysis(flows(0.2101, 0.2111)).status).toBe('none')
    expect(irrAnalysis(flows(0.2, 0.25)).status).toBe('multiple')
  })
})

describe('5. Valeur actualisée et horizons différents', () => {
  it('la note ne présente pas le gain actualisé comme suffisant', () => {
    expect(fr.comparison.horizon).toContain('sans le supprimer')
    expect(fr.comparison.inflationHint).not.toContain('permet de comparer')
  })
})

describe('Paramètres fiscaux conformes aux sources officielles', () => {
  it('brochure IR 2026 : plafonds du quotient familial et décote', () => {
    expect(fiscal.incomeTax.qfCapPerHalfPart).toBe(1807)
    expect(fiscal.incomeTax.qfCapSingleParent).toBe(4262)
    expect(fiscal.incomeTax.decote).toEqual({ single: 897, couple: 1483, rate: 45.25 })
  })

  it('Service-Public F2329 : CSG déductible de 6,8 %', () => {
    expect(fiscal.social.deductibleCsg).toBe(6.8)
  })
})
