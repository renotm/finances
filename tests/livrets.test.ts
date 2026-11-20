import { describe, expect, it } from 'vitest'
import { simulate } from './helpers'

describe('Livret A (quinzaines)', () => {
  it('intérêts arrondis au centime à leur inscription', () => {
    // 1 234,56 € un an à 1,7 % : 20,98752 € → 20,99 €
    expect(simulate('livretA', { initialCapital: 1234.56, rate: 1.7 }).summary.gains).toBe(20.99)
  })

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
    // intérêts de clôture : 1 008,50 × 1,7 % / 2 = 8,57225 €, inscrits arrondis au centime (8,57 €)
    expect(r.summary.finalGross).toBeCloseTo(1008.5 + 8.57, 6)
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
  it("PFU : 31,4 % retenus par la banque à l'inscription des intérêts, seuls les intérêts nets sont capitalisés", () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5 })
    // 150 € d'intérêts : 27,90 € de prélèvements sociaux + 19,20 € d'acompte retenus ; solde réel 10 102,90 €
    expect(r.summary.finalGross).toBeCloseTo(10102.9, 6)
    expect(r.summary.taxes).toBeCloseTo(47.1, 6)
    expect(r.summary.finalNet).toBeCloseTo(10102.9, 6)
  })

  it('PFU sur 10 ans : capitalisation des seuls intérêts nets (calcul indépendant année par année)', () => {
    let b = 10000
    for (let y = 0; y < 10; y++) {
      const i = Math.round(b * 0.015 * 100) / 100
      b += i - Math.round(i * 0.186 * 100) / 100 - Math.round(i * 0.128 * 100) / 100
    }
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, durationYears: 10 })
    expect(r.summary.finalGross).toBeCloseTo(b, 6)
    expect(r.summary.finalNet).toBeCloseTo(b, 6)
  })

  it("dispense d'acompte : seuls les prélèvements sociaux sont retenus, l'impôt est payé à part", () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, pfnlExemption: true })
    expect(r.summary.finalGross).toBeCloseTo(10000 + 150 - 27.9, 6)
    expect(r.summary.finalNet).toBeCloseTo(10102.9, 6)
  })

  it("option barème sans contexte fiscal : TMI, CSG déductible, régularisation de l'acompte", () => {
    const r = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, taxMode: 'bareme', tmi: 11 })
    // impôt 150 × 11 % − 10,20 € de CSG déductible × 11 % ; acompte de 19,20 € remboursé en partie
    expect(r.summary.taxes).toBeCloseTo(27.9 + 150 * 0.11 - 10.2 * 0.11, 2)
    expect(r.warnings.map((w) => w.code)).toContain('taxApproxBareme')
  })

  it('option barème avec contexte fiscal : impôt réel, décote comprise', () => {
    // célibataire, 20 000 € : dans la zone de décote, le taux marginal effectif est 11 % × 1,4525 = 15,98 %
    // impôt(20 150) − impôt(20 000) = 469,08 − 445,11 = 23,97 € ; CSG déductible 10,20 € → 1,63 €
    const r = simulate('livretBancaire', {
      initialCapital: 10000,
      baseRate: 1.5,
      taxMode: 'bareme',
      taxContext: { situation: 'single', children: [], livesAlone: true, income: 20000, retirementIncome: null, retirementPensions: null },
    })
    expect(r.summary.taxes).toBeCloseTo(27.9 + 23.97 - 1.63, 1)
    expect(r.summary.finalNet).toBeCloseTo(10102.9 - (23.97 - 1.63 - 19.2), 1)
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
