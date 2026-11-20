/**
 * Cohérence des comparaisons (phase 5) : TRI et sa pertinence, actualisation, rendement réel,
 * réinvestissement des économies d'impôt, conservation des flux. Attendus calculés à la main.
 */
import { describe, expect, it } from 'vitest'
import { irrAnalysis, presentValue, realReturn } from '../src/engine/core/irr'
import { simulate } from './helpers'

describe('TRI et sa pertinence', () => {
  it('flux simples : TRI unique', () => {
    const r = irrAnalysis([{ i: 0, amount: -1000 }, { i: 12, amount: 1100 }])
    expect(r.status).toBe('ok')
    expect(r.rate!).toBeCloseTo(0.1, 9)
  })

  it('flux alternés à deux racines (10 % et 20 % par période) : TRI multiple, non pertinent', () => {
    // −100 + 230 / (1 + r) − 132 / (1 + r)² = 0 pour r = 10 % et r = 20 %
    const r = irrAnalysis([{ i: 0, amount: -100 }, { i: 1, amount: 230 }, { i: 2, amount: -132 }])
    expect(r.status).toBe('multiple')
    expect(r.rate).toBeNull()
  })

  it('flux tous négatifs : TRI indéterminé', () => {
    expect(irrAnalysis([{ i: 0, amount: -100 }, { i: 5, amount: -50 }]).status).toBe('none')
  })
})

describe('actualisation et rendement réel', () => {
  it('valeur actuelle nulle au taux de rendement du placement', () => {
    expect(presentValue([{ i: 0, amount: -1000 }, { i: 12, amount: 1100 }], 0.1)).toBeCloseTo(0, 9)
  })

  it('valeur actuelle à 2 % : 1 100 € dans un an valent 1 078,43 € aujourd\'hui', () => {
    expect(presentValue([{ i: 12, amount: 1100 }], 0.02)).toBeCloseTo(1100 / 1.02, 9)
  })

  it('rendement réel = (1 + nominal) ÷ (1 + inflation) − 1', () => {
    expect(realReturn(0.05, 0.02)).toBeCloseTo(1.05 / 1.02 - 1, 12)
  })
})

describe('économies d\'impôt du PER : conservées ou réinvesties, sans double comptage', () => {
  // 2 ans, 1 000 € versés, rendement net nul, TMI 30 % puis 11 % à la sortie, sans contexte fiscal
  const base = { currentAge: 40, retirementAge: 42, initialCapital: 1000, euroShare: 100, euroRate: 0.6, euroFee: 0.6, tmiNow: 30, tmiRetirement: 11 }

  it('conservées : capital 1 000 €, impôt de sortie 110 €, économie de 300 € à part', () => {
    const r = simulate('per', base)
    expect(r.summary.reinvestedSavings).toBe(0)
    expect(r.summary.finalNet).toBeCloseTo(1000 - 110 + 300, 6)
  })

  it('réinvesties : 300 € versés en janvier, eux-mêmes déductibles (90 €), sans être comptés deux fois', () => {
    const r = simulate('per', { ...base, reinvestSavings: true })
    expect(r.summary.reinvestedSavings).toBeCloseTo(300, 6)
    expect(r.summary.totalDeposited).toBeCloseTo(1300, 6)
    // capital 1 300 €, impôt de sortie 143 €, économie de la 2e année (90 €) conservée car la phase d'épargne s'achève
    expect(r.summary.finalNet).toBeCloseTo(1300 - 143 + 90, 6)
  })
})

describe('conservation des flux', () => {
  const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0)

  it('Livret A : valeur finale = versements − retraits + intérêts', () => {
    const r = simulate('livretA', { initialCapital: 5000, periodicAmount: 200, durationYears: 5, movements: [{ id: 1, date: '2028-03', amount: 1500, kind: 'withdrawal' }] })
    const s = r.summary
    expect(s.finalGross).toBeCloseTo(s.totalDeposited - s.totalWithdrawn + s.gains, 6)
  })

  it('livret bancaire : valeur finale = versements + intérêts − retenues ; flux nets = valeur nette − effort', () => {
    const r = simulate('livretBancaire', { initialCapital: 5000, periodicAmount: 200, durationYears: 5, baseRate: 1.5 })
    const s = r.summary
    expect(s.finalGross).toBeCloseTo(s.totalDeposited + s.gains - s.taxes, 6)
    expect(sum(r.flows.net)).toBeCloseTo(s.finalNet - s.totalDeposited, 6)
  })

  it('assurance vie : valeur finale = versements + gains − frais − prélèvements annuels', () => {
    const r = simulate('assuranceVie', { initialCapital: 5000, periodicAmount: 200, durationYears: 5, euroShare: 60, ucRate: 5, ucFee: 0.6 })
    const s = r.summary
    const annualSocial = r.years.reduce((a, y) => a + y.taxes, 0)
    expect(s.finalGross).toBeCloseTo(s.totalDeposited + s.gains - s.fees - annualSocial, 4)
    expect(sum(r.flows.net)).toBeCloseTo(s.finalNet - s.totalDeposited, 4)
  })

  it('PER (sortie en capital) : valeur = versements + gains − frais ; flux nets = valeur nette − effort', () => {
    const r = simulate('per', { currentAge: 40, retirementAge: 50, initialCapital: 2000, periodicAmount: 150, euroShare: 50, ucRate: 5 })
    const s = r.summary
    expect(s.finalGross).toBeCloseTo(s.totalDeposited + s.gains - s.fees, 4)
    expect(sum(r.flows.net)).toBeCloseTo(s.finalNet - (s.totalDeposited - s.reinvestedSavings), 4)
  })

  it('PER avec réinvestissement : la même égalité tient, effort hors économies réinvesties', () => {
    const r = simulate('per', { currentAge: 40, retirementAge: 50, initialCapital: 2000, periodicAmount: 150, reinvestSavings: true })
    const s = r.summary
    expect(sum(r.flows.net)).toBeCloseTo(s.finalNet - (s.totalDeposited - s.reinvestedSavings), 4)
  })
})
