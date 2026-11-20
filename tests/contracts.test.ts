import { describe, expect, it } from 'vitest'
import { getProduct } from '../src/engine/registry'
import { runSimulation } from '../src/engine/run'
import { params, simulate } from './helpers'

const euroOnly = { euroShare: 100, euroRate: 3.2, euroFee: 0.6, entryFee: 0 }
const ucOnly = { euroShare: 0, ucRate: 5, ucFee: 0, entryFee: 0 }

describe('Assurance vie', () => {
  it('fonds euros : intérêts nets de frais, prélèvements sociaux annuels', () => {
    const r = simulate('assuranceVie', { initialCapital: 10000, ...euroOnly })
    // 10 000 × (3,2 % − 0,6 %) = 260 ; prélèvements sociaux 17,2 % = 44,72
    expect(r.summary.finalGross).toBeCloseTo(10215.28, 6)
    expect(r.summary.fees).toBeCloseTo(60, 6)
  })

  it('rachat avant 8 ans : 12,8 % sur les gains, prélèvements déjà payés non redemandés', () => {
    const r = simulate('assuranceVie', { initialCapital: 10000, ...euroOnly })
    expect(r.summary.finalNet).toBeCloseTo(10215.28 - 260 * 0.128, 6)
  })

  it('rachat après 8 ans : abattement de 4 600 €', () => {
    const r = simulate('assuranceVie', {
      initialCapital: 10000,
      ...euroOnly,
      existingContract: true,
      openingDate: '2017-01',
    })
    expect(r.summary.finalNet).toBeCloseTo(10215.28, 6)
  })

  it('unités de compte : prélèvements sociaux et impôt à la sortie', () => {
    const r = simulate('assuranceVie', { initialCapital: 10000, ...ucOnly })
    expect(r.summary.finalGross).toBeCloseTo(10500, 6)
    expect(r.summary.finalNet).toBeCloseTo(10500 - 500 * (0.172 + 0.128), 6)
  })

  it('après 8 ans, au-delà de 150 000 € de versements : 7,5 % au prorata, 12,8 % au-delà', () => {
    const r = simulate('assuranceVie', {
      initialCapital: 300000,
      euroShare: 0,
      ucRate: 10,
      ucFee: 0,
      existingContract: true,
      openingDate: '2010-01',
    })
    const taxable = 30000 - 4600
    const incomeTax = taxable * (0.5 * 0.075 + 0.5 * 0.128)
    expect(r.summary.finalNet).toBeCloseTo(330000 - incomeTax - 30000 * 0.172, 4)
  })

  it('frais sur versements, sauf capital initial d\'un contrat existant', () => {
    const fresh = simulate('assuranceVie', { initialCapital: 10000, ...euroOnly, euroRate: 0.6, entryFee: 2 })
    expect(fresh.summary.finalGross).toBeCloseTo(9800, 6)
    const existing = simulate('assuranceVie', {
      initialCapital: 10000,
      ...euroOnly,
      euroRate: 0.6,
      entryFee: 2,
      existingContract: true,
      openingDate: '2020-01',
    })
    expect(existing.summary.finalGross).toBeCloseTo(10000, 6)
  })

  it('rachat partiel : seule la part de gains est imposée', () => {
    const r = simulate('assuranceVie', {
      initialCapital: 10000,
      ...ucOnly,
      durationYears: 2,
      movements: [{ id: 1, date: '2027-01', amount: 5250, kind: 'withdrawal' }],
    })
    // Au 01/2027 : valeur 10 500, retrait de la moitié → gains 250 imposés à 30 %
    expect(r.summary.totalWithdrawn).toBeCloseTo(5250, 6)
    expect(r.years[1].taxes).toBeCloseTo(250 * 0.3, 6)
  })

  it('fourchette basse / haute pour les UC', () => {
    const { result, band } = runSimulation('assuranceVie', params('assuranceVie', { initialCapital: 10000, ...ucOnly }))
    expect(band).toBeDefined()
    const last = (pts: { gross: number }[]) => pts[pts.length - 1].gross
    expect(last(band!.low)).toBeCloseTo(10100, 6) // équilibré : 5 % − 4 points
    expect(last(band!.high)).toBeCloseTo(10900, 6)
    expect(result.summary.finalGross).toBeCloseTo(10500, 6)
  })

  it('pas de fourchette à 100 % fonds euros', () => {
    const { band } = runSimulation('assuranceVie', params('assuranceVie', { initialCapital: 10000, ...euroOnly }))
    expect(band).toBeUndefined()
  })
})

describe('PER', () => {
  const oneYear = { currentAge: 40, retirementAge: 41, ...euroOnly, tmiNow: 30, tmiRetirement: 11 }

  it('économie d\'impôt à l\'entrée et sortie en capital', () => {
    const r = simulate('per', { ...oneYear, initialCapital: 4000 })
    expect(r.summary.finalGross).toBeCloseTo(4104, 6)
    expect(r.summary.taxSavings).toBeCloseTo(1200, 6)
    const exitTax = 4000 * 0.11 + 104 * (0.128 + 0.186)
    expect(r.summary.finalNet).toBeCloseTo(4104 - exitTax + 1200, 6)
  })

  it('plafond de déduction dépassé : avertissement, excédent non déduit', () => {
    const r = simulate('per', { ...oneYear, initialCapital: 10000 })
    expect(r.summary.taxSavings).toBeCloseTo(4710 * 0.3, 6)
    expect(r.warnings.map((w) => w.code)).toContain('perCeilingExceeded')
    const exitTax = 4710 * 0.11 + 260 * (0.128 + 0.186)
    expect(r.summary.finalNet).toBeCloseTo(10260 - exitTax + 1413, 6)
  })

  it('plafond calculé sur les revenus ou saisi directement', () => {
    const fromIncome = simulate('per', { ...oneYear, initialCapital: 10000, income: 60000 })
    expect(fromIncome.summary.taxSavings).toBeCloseTo(6000 * 0.3, 6)
    const override = simulate('per', { ...oneYear, initialCapital: 10000, ceilingOverride: 8000 })
    expect(override.summary.taxSavings).toBeCloseTo(8000 * 0.3, 6)
  })

  it('versements non déduits : pas d\'économie, versements exonérés à la sortie', () => {
    const r = simulate('per', { ...oneYear, initialCapital: 4000, deducted: false })
    expect(r.summary.taxSavings).toBe(0)
    expect(r.summary.finalNet).toBeCloseTo(4104 - 104 * 0.314, 6)
  })

  it('rente par taux de conversion, fiscalité selon l\'âge', () => {
    const r = simulate('per', { ...oneYear, initialCapital: 4000, exitMode: 'annuity', annuityMethod: 'conversion', conversionRate: 3.5, arrearsFee: 0 })
    const gross = 4104 * 0.035
    // Versements déduits : barème après abattement de 10 % ; prélèvements sociaux sur 70 % (moins de 50 ans)
    const net = gross - gross * 0.9 * 0.11 - gross * 0.7 * 0.186
    expect(r.annuity?.indicative).toBe(false)
    expect(r.annuity?.grossYearly).toBeCloseTo(gross, 6)
    expect(r.annuity?.netYearly).toBeCloseTo(net, 6)
    expect(r.annuity?.breakEvenAge).toBeCloseTo(41 + 4104 / net, 6)
  })

  it('rendement annuel réaliste sur une longue durée', () => {
    const r = simulate('per', { currentAge: 40, retirementAge: 64, initialCapital: 1000, periodicAmount: 600, euroShare: 40 })
    expect(r.summary.annualReturnNet).not.toBeNull()
    expect(r.summary.annualReturnNet!).toBeGreaterThan(0)
    expect(r.summary.annualReturnNet!).toBeLessThan(0.15)
    expect(r.warnings.filter((w) => w.code === 'perCeilingExceeded')).toHaveLength(1)
  })

  describe('rente viagère par table de mortalité', () => {
    // Épargne d'un an (63 → 64 ans), rendement net nul : capital de 10 000 € à la retraite.
    const base = {
      currentAge: 63,
      retirementAge: 64,
      initialCapital: 10000,
      euroShare: 100,
      euroRate: 0.6,
      euroFee: 0.6,
      tmiNow: 30,
      tmiRetirement: 11,
      income: 100000, // plafond de déduction de 10 000 € : tout le versement est déduit
      exitMode: 'annuity',
      annuityMethod: 'table',
      lifeExpectancy: 86,
      lifeGainPerDecade: 1,
      technicalRate: 0.5,
      arrearsFee: 2,
    }
    const annuityFactor = (n: number, t = 0.005) => t / (1 - Math.pow(1 + t, -n))
    const netOf = (gross: number) => gross - gross * 0.9 * 0.11 - gross * 0.4 * 0.186 // 64 ans : fraction 40 %

    it('table garantie : durée = espérance de vie − âge de départ', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      expect(r.annuity?.calcYears).toBeCloseTo(22, 9)
      expect(r.annuity?.grossYearly).toBeCloseTo(10000 * annuityFactor(22) * 0.98, 6)
      expect(r.annuity?.guaranteedNetYearly).toBeNull()
    })

    it('table non garantie : l\'espérance de vie progresse jusqu\'à la retraite', () => {
      const r = simulate('per', { ...base, tableGuaranteed: false })
      expect(r.annuity?.calcYears).toBeCloseTo(22.1, 9)
      expect(r.annuity?.grossYearly).toBeCloseTo(10000 * annuityFactor(22.1) * 0.98, 6)
      expect(r.annuity?.guaranteedNetYearly).toBeCloseTo(netOf(10000 * annuityFactor(22) * 0.98), 6)
    })

    it('versement jusqu\'à l\'espérance de vie retenue par défaut, au-delà si on le demande', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      const gross = 10000 * annuityFactor(22) * 0.98
      expect(r.annuity?.endAge).toBeCloseTo(86, 9)
      expect(r.annuity?.totalNet).toBeCloseTo(netOf(gross) * 22, 6)
      expect(r.summary.finalNet).toBeCloseTo(netOf(gross) * 22 + 3000, 6) // + économie d'impôt : 10 000 × 30 %
      const longer = simulate('per', { ...base, tableGuaranteed: true, endAge: 95 })
      expect(longer.annuity?.totalNet).toBeCloseTo(netOf(gross) * 31, 6)
      expect(longer.years[longer.years.length - 1].year).toBeGreaterThan(r.years[r.years.length - 1].year)
    })

    it('âge à partir duquel la rente a rapporté plus que le capital', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      const net = netOf(10000 * annuityFactor(22) * 0.98)
      expect(r.annuity?.breakEvenAge).toBeCloseTo(64 + 10000 / net, 6)
    })

    it('sortie mixte : part en capital versée à la retraite, rente sur le reste', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true, exitMode: 'mixed', capitalShare: 50 })
      expect(r.summary.totalWithdrawn).toBeCloseTo(5000, 6)
      expect(r.annuity?.grossYearly).toBeCloseTo(5000 * annuityFactor(22) * 0.98, 6)
    })

    it('sortie en capital : rente donnée à titre indicatif, pas de phase de versement', () => {
      const r = simulate('per', { ...base, exitMode: 'capital' })
      expect(r.annuity?.indicative).toBe(true)
      expect(r.annuity?.totalNet).toBeNull()
      expect(r.years.every((y) => y.annuityGross === 0)).toBe(true)
    })

    it('âge de fin avant la retraite : avertissement, pas de rente versée', () => {
      const r = simulate('per', { ...base, endAge: 60 })
      expect(r.warnings.map((w) => w.code)).toContain('perEndAgeBeforeRetirement')
      expect(r.annuity?.totalNet).toBe(0)
    })

    it('rendement annuel calculé avec les rentes perçues', () => {
      const r = simulate('per', { ...base, currentAge: 40, periodicAmount: 300, tableGuaranteed: true })
      expect(r.summary.annualReturnNet).not.toBeNull()
      expect(r.summary.annualReturnNet!).toBeGreaterThan(-0.05)
      expect(r.summary.annualReturnNet!).toBeLessThan(0.15)
    })
  })

  describe('bouton Max', () => {
    const action = getProduct('per').params.find((d) => d.key === 'periodicAmount')!.action!

    it('plafond ÷ 12 en mensuel, plafond entier en annuel', () => {
      expect(action.value(params('per', { income: 60000 }))).toBe(500)
      expect(action.value(params('per', { income: 60000, frequency: 'yearly' }))).toBe(6000)
    })

    it('plancher sans revenus, plafond de l\'avis d\'impôt s\'il est saisi', () => {
      expect(action.value(params('per', {}))).toBe(392)
      expect(action.value(params('per', { income: 60000, ceilingOverride: 9000 }))).toBe(750)
    })

    it('visible seulement si les versements sont déduits', () => {
      expect(action.visible(params('per', { deducted: true }))).toBe(true)
      expect(action.visible(params('per', { deducted: false }))).toBe(false)
    })
  })

  it('durée = âge de départ − âge actuel', () => {
    const r = simulate('per', { currentAge: 40, retirementAge: 64, periodicAmount: 100 })
    expect(r.summary.totalDeposited).toBe(100 * 12 * 24)
  })

  it('déblocage anticipé : imposé avec la TMI actuelle', () => {
    const r = simulate('per', {
      ...oneYear,
      currentAge: 40,
      retirementAge: 42,
      initialCapital: 4000,
      euroRate: 0.6,
      movements: [{ id: 1, date: '2027-01', amount: 2000, kind: 'earlyRelease' }],
    })
    // Rendement net nul : la moitié des versements déduits sort, imposée à 30 %
    expect(r.years[1].taxes).toBeCloseTo(2000 * 0.3, 6)
  })
})
