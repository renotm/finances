import { describe, expect, it } from 'vitest'
import { simulate } from './helpers'

describe('Livret A (quinzaines)', () => {
  it('capital seul pendant un an : 24 quinzaines au taux', () => {
    const r = simulate('livretA', { initialCapital: 1200, rate: 1.7 })
    expect(r.summary.gains).toBeCloseTo(20.4, 6)
    expect(r.summary.finalGross).toBeCloseTo(1220.4, 6)
    expect(r.summary.finalNet).toBeCloseTo(1220.4, 6)
  })

  it('versement du 1er du mois : intérêts à partir du 16', () => {
    // 100 €/mois de janvier à décembre : 1 + 2 × (11 − m) quinzaines pour le versement du mois m → 144 quinzaines
    const r = simulate('livretA', { periodicAmount: 100, rate: 1.7 })
    expect(r.summary.totalDeposited).toBe(1200)
    expect(r.summary.gains).toBeCloseTo((100 * 0.017 * 144) / 24, 6)
  })

  it('retrait : cesse de porter intérêt dès la quinzaine en cours', () => {
    const r = simulate('livretA', {
      initialCapital: 1200,
      rate: 1.7,
      movements: [{ id: 1, date: '2026-07', amount: 600, kind: 'withdrawal' }],
    })
    expect(r.summary.gains).toBeCloseTo(((12 * 1200 + 12 * 600) * 0.017) / 24, 6)
    expect(r.summary.finalGross).toBeCloseTo(615.3, 6)
  })

  it('départ en cours d\'année : intérêts crédités au 31/12 puis à la clôture', () => {
    const r = simulate('livretA', { start: '2026-07', initialCapital: 1000, rate: 1.7 })
    expect(r.years.map((y) => y.year)).toEqual([2026, 2027])
    expect(r.years[0].endValue).toBeCloseTo(1008.5, 6)
    expect(r.summary.finalGross).toBeCloseTo(1008.5 + (1008.5 * 0.017) / 2, 6)
  })

  it('plafond : les versements au-delà sont bloqués', () => {
    const r = simulate('livretA', { initialCapital: 22900, periodicAmount: 100 })
    expect(r.summary.totalDeposited).toBe(22950)
    expect(r.warnings.map((w) => w.code)).toContain('capReached')
  })

  it('capital initial au-dessus du plafond : accepté, versements bloqués', () => {
    const r = simulate('livretA', { initialCapital: 25000, periodicAmount: 100 })
    expect(r.summary.totalDeposited).toBe(25000)
    expect(r.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['initialAboveCap', 'capReached']))
  })

  it('versement annuel : le 1er mois puis tous les 12 mois', () => {
    const r = simulate('livretA', { periodicAmount: 1200, frequency: 'yearly', durationYears: 2 })
    expect(r.summary.totalDeposited).toBe(2400)
  })

  it('rendement annuel égal au taux pour un capital placé un an', () => {
    const r = simulate('livretA', { initialCapital: 1200, rate: 1.7 })
    expect(r.summary.annualReturnGross).toBeCloseTo(0.017, 6)
    expect(r.summary.annualReturnNet).toBeCloseTo(0.017, 6)
  })

  it('mouvement hors période : ignoré avec un avertissement', () => {
    const r = simulate('livretA', {
      initialCapital: 1000,
      movements: [{ id: 1, date: '2030-01', amount: 500, kind: 'deposit' }],
    })
    expect(r.summary.totalDeposited).toBe(1000)
    expect(r.warnings.map((w) => w.code)).toContain('movementOutOfRange')
  })
})

describe('Livret bancaire', () => {
  it('flat tax 31,4 % payée chaque année', () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5 })
    expect(r.summary.finalGross).toBeCloseTo(10150, 6)
    expect(r.summary.taxes).toBeCloseTo(150 * 0.314, 6)
    expect(r.summary.finalNet).toBeCloseTo(10150 - 47.1, 6)
  })

  it('option barème : TMI + prélèvements sociaux', () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, taxMode: 'bareme', tmi: 11 })
    expect(r.summary.taxes).toBeCloseTo(150 * (0.11 + 0.186), 6)
  })

  it('boost limité dans le temps', () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, boostRate: 3, boostMonths: 6 })
    expect(r.summary.gains).toBeCloseTo(150 + 75, 6)
  })

  it('boost plafonné en montant', () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1, boostRate: 3, boostCap: 4000 })
    expect(r.summary.gains).toBeCloseTo(4000 * 0.03 + 6000 * 0.01, 6)
  })
})
