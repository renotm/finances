import { describe, expect, it } from 'vitest'
import { annuityTaxableFraction, carryLastYear, tgf05Price } from '../src/engine/products/per'
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

  it('rente par taux de conversion contractuel, fiscalité selon l\'âge', () => {
    const r = simulate('per', { ...oneYear, initialCapital: 4000, exitMode: 'annuity', annuityMethod: 'conversion', conversionRate: 3.5, arrearsFee: 0 })
    const gross = 4104 * 0.035
    // Sans contexte fiscal : pension imposée après abattement de 10 % (sans plancher), TMI à la retraite 11 % ;
    // prélèvements sociaux sur 70 % (moins de 50 ans à l'entrée en jouissance)
    const net = gross - gross * 0.9 * 0.11 - gross * 0.7 * 0.186
    expect(r.annuity?.estimated).toBe(false)
    expect(r.annuity?.grossYearly).toBeCloseTo(gross, 6)
    expect(r.annuity?.netYearly).toBeCloseTo(net, 6)
    // Comparaison avec le capital net : 4 104 − (4 000 × 11 % + 104 × 31,4 %)
    const capitalNet = 4104 - (4000 * 0.11 + 104 * 0.314)
    expect(r.annuity?.capitalAlternativeNet).toBeCloseTo(capitalNet, 6)
    expect(r.annuity?.breakEvenAge).toBeCloseTo(41 + capitalNet / net, 6)
  })

  describe('rente viagère estimée sur la table TGF05 (taux technique 0 %)', () => {
    // Épargne d'un an (63 → 64 ans), rendement net nul : 10 000 € à la retraite, entièrement déduits.
    const base = {
      currentAge: 63,
      retirementAge: 64,
      initialCapital: 10000,
      euroShare: 100,
      euroRate: 0.6,
      euroFee: 0.6,
      tmiNow: 30,
      tmiRetirement: 11,
      ceilingOverride: 10000,
      exitMode: 'annuity',
      annuityMethod: 'table',
      lifeExpectancy: 86,
      lifeGainPerDecade: 1,
      arrearsFee: 2,
    }
    // Prix d'un euro de rente publiés (tarif 1/1/2026) : 64 ans 31,7745 ; 63 ans 32,9004
    const price64 = 31.7745
    const price639 = 32.9004 + (31.7745 - 32.9004) * 0.9
    const netOf = (gross: number) => gross - gross * 0.9 * 0.11 - gross * 0.4 * 0.186 // 64 ans : fraction 40 %

    it('table garantie : capital ÷ prix d\'un euro de rente à l\'âge de départ', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      expect(r.annuity?.annuityPrice).toBeCloseTo(price64, 9)
      expect(r.annuity?.grossYearly).toBeCloseTo((10000 / price64) * 0.98, 6)
      expect(r.annuity?.estimated).toBe(true)
      expect(r.annuity?.guaranteedNetYearly).toBeNull()
    })

    it('table non garantie : décalage d\'âge selon la hausse de l\'espérance de vie (0,1 an ici)', () => {
      const r = simulate('per', { ...base, tableGuaranteed: false })
      expect(r.annuity?.tableAge).toBeCloseTo(63.9, 9)
      expect(r.annuity?.grossYearly).toBeCloseTo((10000 / price639) * 0.98, 6)
      expect(r.annuity?.guaranteedNetYearly).toBeCloseTo(netOf((10000 / price64) * 0.98), 6)
    })

    it('taux de conversion implicite dans la fourchette du marché (3,1 à 4,3 % à 64-65 ans)', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true, arrearsFee: 0 })
      const rate = r.annuity!.grossYearly / 10000
      expect(rate).toBeGreaterThanOrEqual(0.031)
      expect(rate).toBeLessThanOrEqual(0.043)
    })

    it('versement jusqu\'à la durée de vie supposée, au-delà si on le demande', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      const net = netOf((10000 / price64) * 0.98)
      expect(r.annuity?.endAge).toBeCloseTo(86, 9)
      expect(r.annuity?.totalNet).toBeCloseTo(net * 22, 6)
      const longer = simulate('per', { ...base, tableGuaranteed: true, endAge: 95 })
      expect(longer.annuity?.totalNet).toBeCloseTo(net * 31, 6)
    })

    it('comparaison avec la même part prise en capital, nette d\'impôt', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true })
      const net = netOf((10000 / price64) * 0.98)
      const capitalNet = 10000 - 10000 * 0.11
      expect(r.annuity?.capitalAlternativeNet).toBeCloseTo(capitalNet, 6)
      expect(r.annuity?.breakEvenAge).toBeCloseTo(64 + capitalNet / net, 6)
    })

    it('sortie mixte : part en capital versée à la retraite, rente sur le reste', () => {
      const r = simulate('per', { ...base, tableGuaranteed: true, exitMode: 'mixed', capitalShare: 50 })
      expect(r.summary.totalWithdrawn).toBeCloseTo(5000, 6)
      expect(r.annuity?.grossYearly).toBeCloseTo((5000 / price64) * 0.98, 6)
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

  describe('fiscalité réelle avec le contexte fiscal du profil', () => {
    const ctxBase = { children: [], livesAlone: true, retirementPensions: null }
    const base2 = () => ({ currentAge: 63, retirementAge: 64, initialCapital: 10000, euroShare: 100, euroRate: 0.6, euroFee: 0.6, ceilingOverride: 10000, exitMode: 'annuity', annuityMethod: 'table', tableGuaranteed: true, arrearsFee: 2 })

    it('économie d\'impôt = impôt avant − impôt après déduction (changement de tranche et décote)', () => {
      const r = simulate('per', {
        ...oneYear,
        euroRate: 0.6,
        initialCapital: 20000,
        ceilingOverride: 30000,
        taxContext: { ...ctxBase, situation: 'married', income: 70000, retirementIncome: null },
      })
      // couple, 70 000 € → 50 000 € : 7 207,98 − 2 798,97 (décote de 149,03 €)
      expect(r.summary.taxSavings).toBeCloseTo(4409.01, 2)
      expect(r.warnings.map((w) => w.code)).not.toContain('taxApproxEntry')
    })

    it('sans contexte : TMI fixe et avertissement « approximatif »', () => {
      const r = simulate('per', { ...oneYear, initialCapital: 4000 })
      expect(r.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['taxApproxEntry', 'taxApproxExit']))
    })

    it('sortie en capital au barème avec le système du quotient', () => {
      // célibataire, 25 000 € de revenu imposable à la retraite, 150 000 € de versements déduits (rendement nul)
      const r = simulate('per', {
        currentAge: 63,
        retirementAge: 64,
        initialCapital: 150000,
        euroShare: 100,
        euroRate: 0.6,
        euroFee: 0.6,
        ceilingOverride: 150000,
        taxContext: { ...ctxBase, situation: 'single', income: 200000, retirementIncome: 25000 },
      })
      // direct 54 306,53 € ; quotient 4 × (11 853,99 − 1 243,99) = 42 440,00 € : le quotient est retenu
      expect(r.summary.taxes).toBeCloseTo(42440.0, 1)
      expect(r.warnings.map((w) => w.code)).not.toContain('taxApproxExit')
    })

    it('rente : abattement de 10 % plafonné compte tenu des pensions du foyer', () => {
      const r = simulate('per', {
        ...base2(),
        taxContext: { ...ctxBase, situation: 'single', income: 50000, retirementIncome: 50000, retirementPensions: 50000 },
      })
      // 50 000 € de pensions : abattement déjà au plafond (4 439 €), la rente déduite est imposable en totalité
      const gross = (10000 / 31.7745) * 0.98
      expect(r.annuity!.netYearly).toBeCloseTo(gross - gross * 0.3 - gross * 0.4 * 0.186, 6)
    })
  })

  describe('déblocages anticipés et versements', () => {
    it('un déblocage ne réduit pas la déduction des versements de l\'année', () => {
      const r = simulate('per', {
        currentAge: 40, retirementAge: 42, euroRate: 0.6, euroFee: 0.6, tmiNow: 30,
        movements: [{ id: 1, date: '2026-03', amount: 5000, kind: 'deposit' }, { id: 2, date: '2026-06', amount: 2500, kind: 'earlyRelease' }],
      })
      // 5 000 € versés, plafond 4 710 € : 4 710 × 30 %
      expect(r.years[0].taxSavings).toBeCloseTo(1413, 6)
    })

    it('accident de la vie : capital exonéré d\'impôt sur le revenu ; résidence principale : imposé', () => {
      const common = { currentAge: 40, retirementAge: 42, initialCapital: 4000, euroRate: 0.6, euroFee: 0.6, tmiNow: 30 }
      const accident = simulate('per', { ...common, movements: [{ id: 1, date: '2027-01', amount: 2000, kind: 'earlyReleaseAccident' }] })
      const home = simulate('per', { ...common, movements: [{ id: 1, date: '2027-01', amount: 2000, kind: 'earlyRelease' }] })
      expect(accident.years[1].taxes).toBeCloseTo(0, 6)
      expect(home.years[1].taxes).toBeCloseTo(2000 * 0.3, 6)
    })

    it('versements à partir de 70 ans : non déductibles', () => {
      const r = simulate('per', { currentAge: 70, retirementAge: 72, start: '2026-01', initialCapital: 1000, euroRate: 0.6, euroFee: 0.6 })
      expect(r.summary.taxSavings).toBe(0)
      expect(r.warnings.map((w) => w.code)).toContain('perAgeLimit')
    })

    it('plafond nul saisi : aucune déduction hors reports', () => {
      const r = simulate('per', { ...oneYear, initialCapital: 1000, ceilingManual: true, ceilingOverride: 0 })
      expect(r.summary.taxSavings).toBe(0)
      expect(r.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['perZeroCeiling', 'perCeilingExceeded']))
    })

    it('mutualisation : le plafond du conjoint après le sien', () => {
      const r = simulate('per', { ...oneYear, euroRate: 0.6, initialCapital: 8000, ceilingOverride: 4000, spouseCeiling: 3000 })
      expect(r.summary.taxSavings).toBeCloseTo(7000 * 0.3, 6)
      expect(r.extraLines).toEqual(expect.arrayContaining([{ key: 'spouseUsed', amount: 3000 }]))
    })
  })

  describe('table de rente et fraction imposable', () => {
    it('prix interpolé entre deux âges', () => {
      expect(tgf05Price(64.5).price).toBeCloseTo((31.7745 + 30.6543) / 2, 9)
      expect(tgf05Price(85).outOfTable).toBe(true)
    })

    it('fraction imposable selon l\'âge révolu à l\'entrée en jouissance', () => {
      expect(annuityTaxableFraction(69.5)).toBe(0.4)
      expect(annuityTaxableFraction(70)).toBe(0.3)
      expect(annuityTaxableFraction(49.99)).toBe(0.7)
    })

    it('champs de report visibles selon leur validité à la date de début', () => {
      const def = (key: string) => getProduct('per').params.find((x) => x.key === key)!
      expect(def('carryN3').visible!(params('per', { start: '2026-01' }))).toBe(true)
      expect(def('carryN4').visible!(params('per', { start: '2026-01' }))).toBe(false)
      expect(def('carryN4').visible!(params('per', { start: '2030-01' }))).toBe(true)
      expect(def('carryN5').visible!(params('per', { start: '2030-01' }))).toBe(false)
      expect(def('carryN5').visible!(params('per', { start: '2031-01' }))).toBe(true)
    })
  })

  const actionOf = (key: string, id: string) =>
    getProduct('per').params.find((d) => d.key === key)!.actions!.find((x) => x.id === id)!

  describe('bouton Max', () => {
    const action = actionOf('periodicAmount', 'maxDeductible')
    const value = (o: Record<string, unknown>) => action.apply(params('per', o)).periodicAmount

    it('plafond ÷ 12 en mensuel, plafond entier en annuel', () => {
      expect(value({ income: 60000 })).toBe(500)
      expect(value({ income: 60000, frequency: 'yearly' })).toBe(6000)
    })

    it('plancher sans revenus, plafond de l\'avis d\'impôt s\'il est saisi', () => {
      expect(value({})).toBe(392)
      expect(value({ income: 60000, ceilingOverride: 9000 })).toBe(750)
    })

    it('ignore les plafonds reportés', () => {
      expect(value({ ceilingOverride: 6000, carryN1: 6000 })).toBe(500)
    })

    it('visible seulement si les versements sont déduits', () => {
      expect(action.visible(params('per', { deducted: true }))).toBe(true)
      expect(action.visible(params('per', { deducted: false }))).toBe(false)
    })
  })

  describe('report des plafonds non utilisés', () => {
    // Début en janvier 2026, plafond annuel de 4 000 €, TMI 30 %, rendement net nul.
    const base = { ...oneYear, currentAge: 40, retirementAge: 41, euroRate: 0.6, ceilingOverride: 4000 }

    it('plafond de l\'année d\'abord, puis les reports du plus ancien au plus récent', () => {
      const r = simulate('per', { ...base, initialCapital: 10000, carryN1: 3000, carryN2: 2000 })
      // 4 000 (année) + 2 000 (2024) + 3 000 (2025) = 9 000 déductibles, 1 000 au-delà
      expect(r.summary.taxSavings).toBeCloseTo(9000 * 0.3, 6)
      expect(r.warnings.map((w) => w.code)).toContain('perCeilingExceeded')
      expect(r.extraLines).toEqual([{ key: 'carryUsed', amount: 5000 }])
    })

    it('le plus ancien est consommé en premier', () => {
      // 5 000 versés : 4 000 sur l'année, 1 000 sur 2023 (qui expire fin 2026) ; celui de 2025 reste intact
      const r = simulate('per', { ...base, initialCapital: 5000, carryN1: 1000, carryN3: 1000 })
      expect(r.summary.taxSavings).toBeCloseTo(5000 * 0.3, 6)
      expect(r.warnings.map((w) => w.code)).not.toContain('perCarryExpired')
    })

    it('un plafond saisi qui expire sans servir est signalé', () => {
      const r = simulate('per', { ...base, initialCapital: 4000, carryN3: 1000 })
      expect(r.warnings).toContainEqual({ code: 'perCarryExpired', params: { amount: 1000 } })
    })

    it('le plafond non utilisé d\'une année sert les années suivantes', () => {
      const r = simulate('per', {
        ...base,
        retirementAge: 43,
        movements: [{ id: 1, date: '2027-06', amount: 8000, kind: 'deposit' }],
      })
      // 2026 : rien versé, 4 000 reportés ; 2027 : 4 000 (année) + 4 000 (report 2026)
      expect(r.years.find((y) => y.year === 2027)?.taxSavings).toBeCloseTo(8000 * 0.3, 6)
      expect(r.warnings.map((w) => w.code)).not.toContain('perCeilingExceeded')
    })

    it('les reports d\'avant 2026 valent 3 ans, ceux d\'après 5 ans', () => {
      expect(carryLastYear(2023)).toBe(2026)
      expect(carryLastYear(2025)).toBe(2028)
      expect(carryLastYear(2026)).toBe(2031)
    })

    it('bouton « Utiliser le report » : versement initial = max déductible la 1re année', () => {
      const action = actionOf('initialCapital', 'useCarryForward')
      expect(action.visible(params('per', {}))).toBe(false)
      // Début en novembre, 100 €/mois (200 € en 2026), plafond 4 710 €, report 9 420 €
      const p = params('per', { start: '2026-11', periodicAmount: 100, carryN1: 4710, carryN2: 4710 })
      expect(action.visible(p)).toBe(true)
      expect(action.apply(p)).toEqual({ initialCapital: 13930 })
      // Recliquer redonne le même montant ; les versements ponctuels prévus la 1re année sont déduits
      expect(action.apply({ ...p, initialCapital: 13930 })).toEqual({ initialCapital: 13930 })
      const withOneOff = { ...p, movements: [{ id: 1, date: '2026-12', amount: 930, kind: 'deposit' as const }] }
      expect(action.apply(withOneOff)).toEqual({ initialCapital: 13000 })
    })

    it('le versement initial ainsi calculé est entièrement déduit, sans dépassement', () => {
      const p = { ...base, start: '2026-11', currentAge: 40, retirementAge: 42, periodicAmount: 100, carryN1: 4710, carryN2: 4710, ceilingOverride: 0 }
      const r = simulate('per', { ...p, initialCapital: 13930 })
      expect(r.years.find((y) => y.year === 2026)?.taxSavings).toBeCloseTo((13930 + 200) * 0.3, 6)
      expect(r.warnings.map((w) => w.code)).not.toContain('perCeilingExceeded')
      expect(r.warnings.map((w) => w.code)).not.toContain('perCarryExpired')
    })

    it('bouton « Estimer » : trois plafonds égaux au plafond annuel', () => {
      const action = actionOf('carryN1', 'estimateCarry')
      expect(action.apply(params('per', { income: 60000 }))).toEqual({ carryN1: 6000, carryN2: 6000, carryN3: 6000 })
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
