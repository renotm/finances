/**
 * Exemples chiffrés de la page « Méthodologie et sources » (SPEC §5.6).
 *
 * Chaque exemple est calculé par les fonctions du moteur, avec des données fixes indépendantes du profil actif :
 * la page ne peut pas afficher un résultat différent de celui du simulateur. `tests/methodology.test.ts` compare
 * chaque valeur à un calcul fait à la main.
 */
import { config } from '../config/defaults'
import { fiscal } from '../config/fiscal'
import { annualIrr, presentValue, realReturn } from '../engine/core/irr'
import { rachatTax, reducedRateShare } from '../engine/products/assuranceVie'
import { annuityTaxableFraction, perCeiling, tgf05Price } from '../engine/products/per'
import { getProduct } from '../engine/registry'
import {
  deductionSaving,
  exceptionalIncomeTax,
  householdPensionAllowance,
  incomeTax,
  taxablePensionIncrement,
  type Composition,
} from '../engine/tax/incomeTax'
import type { SimParams } from '../engine/types'

const single: Composition = { situation: 'single', children: 0, livesAlone: true }
const coupleTwoChildren: Composition = { situation: 'married', children: 2, livesAlone: true }
const couple: Composition = { situation: 'married', children: 0, livesAlone: true }

/** Simulation d'un placement avec ses valeurs par défaut de la config (jamais celles du profil), sur un an. */
function simulate(productId: string, overrides: Record<string, unknown>) {
  const params = {
    ...getProduct(productId).defaults(),
    start: '2026-01',
    durationYears: 1,
    initialCapital: 0,
    periodicAmount: 0,
    movements: [],
    ...overrides,
  } as SimParams
  return getProduct(productId).simulate(params, 'mid')
}

export function methodologyExamples() {
  // ---------- Impôt sur le revenu ----------
  const tax40k = incomeTax(40000, single)

  const qfIncome = 80000
  const qf = incomeTax(qfIncome, coupleTwoChildren)
  const qfBase = incomeTax(qfIncome, couple)
  // Impôt sans plafonnement : 3 parts × impôt d'une part (avant décote).
  const qfUncapped = 3 * incomeTax(qfIncome / 3, single).grossTax

  const decote = incomeTax(20000, single)

  // ---------- Économie d'impôt d'un versement PER ----------
  const savingBracket = { income: 32000, deduction: 4710, tmi: 30 }
  const savingBracketValue = deductionSaving(savingBracket.income, savingBracket.deduction, single)
  const savingDecote = { income: 22000, deduction: 4000, tmi: 11 }
  const savingDecoteValue = deductionSaving(savingDecote.income, savingDecote.deduction, single)

  // ---------- Sortie en capital du PER : système du quotient ----------
  const quotientCase = { income: 25000, capital: 40000 }
  const quotient = exceptionalIncomeTax(quotientCase.income, quotientCase.capital, single)

  // ---------- Plafond PER ----------
  const perDefaults = getProduct('per').defaults()
  const ceilingOf = (income: number) => perCeiling({ ...perDefaults, ceilingManual: false, ceilingOverride: 0, income } as SimParams)
  const ceilings = [20000, 60000, 500000].map((income) => ({ income, ceiling: ceilingOf(income) }))

  // ---------- Rente ----------
  const annuityCapital = 100000
  const annuityAge = 64
  const annuityPrice = tgf05Price(annuityAge).price
  const annuityFee = config.per.annuity.arrearsFee
  const annuityGross = (annuityCapital / annuityPrice) * (1 - annuityFee / 100)
  const rvtoFraction = annuityTaxableFraction(annuityAge)

  // ---------- Abattement sur les pensions ----------
  const pensions = { holder: 1000, spouse: 20000, annuity: 2000 }
  const pensionsAllowance = householdPensionAllowance([pensions.holder, pensions.spouse])
  const annuityTaxable = taxablePensionIncrement(pensions.annuity, pensions.holder, [pensions.spouse])

  // ---------- Livrets (moteur complet) ----------
  const livretA = simulate('livretA', { movements: [{ id: 1, date: '2026-03', amount: 1000, kind: 'deposit' }] })
  const bancaire = simulate('livretBancaire', { initialCapital: 10000, baseRate: 1.5, taxMode: 'flat', pfnlExemption: false })
  const bancaireYear = bancaire.years[0]

  // ---------- Assurance vie : rachat partiel ----------
  const av = { value: 50000, premiums: 40000, withdrawal: 10000 }
  const avGains = av.withdrawal - av.premiums * (av.withdrawal / av.value)
  const avBase = { gains: avGains, socialCredit: 0, preShare: 0, reducedShare: reducedRateShare(av.premiums, 0), socialRate: fiscal.social.lifeInsurance / 100 }
  const avBefore8 = rachatTax({ ...avBase, ageMonths: 5 * 12, allowanceLeft: 0 })
  const avAfter8 = rachatTax({ ...avBase, ageMonths: 10 * 12, allowanceLeft: fiscal.lifeInsurance.allowanceSingle })

  // ---------- Indicateurs de comparaison ----------
  const irr = annualIrr([{ i: 0, amount: -1000 }, { i: 12, amount: 1100 }])
  const real = realReturn(0.03, 0.02)
  const pv = presentValue([{ i: 120, amount: 1000 }], 0.02)

  return {
    tax40k,
    qf: { income: qfIncome, result: qf, base: qfBase, uncapped: qfUncapped, cap: 2 * fiscal.incomeTax.qfCapPerHalfPart },
    decote,
    savingBracket: { ...savingBracket, saving: savingBracketValue, naive: (savingBracket.deduction * savingBracket.tmi) / 100 },
    savingDecote: { ...savingDecote, saving: savingDecoteValue, naive: (savingDecote.deduction * savingDecote.tmi) / 100 },
    quotient: { ...quotientCase, ...quotient },
    ceilings,
    annuity: { capital: annuityCapital, age: annuityAge, price: annuityPrice, fee: annuityFee, gross: annuityGross, rvtoFraction },
    pensions: { ...pensions, allowance: pensionsAllowance, annuityTaxable },
    livretA: { deposit: 1000, interest: livretA.summary.gains },
    bancaire: {
      capital: 10000,
      interest: bancaireYear.gains,
      withheld: bancaireYear.taxes,
      finalGross: bancaire.summary.finalGross,
    },
    av: { ...av, gains: avGains, before8: avBefore8, after8: avAfter8 },
    irr,
    real,
    pv,
  }
}

export type MethodologyExamples = ReturnType<typeof methodologyExamples>
