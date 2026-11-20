/**
 * Assurance vie (SPEC §4.3, FISCAL_RULES.md §4).
 *
 * Rachats imposés selon CGI art. 125-0 A : produits = montant racheté − quote-part des primes ;
 * primes versées avant / depuis le 27/09/2017 ; abattement annuel imputé d'abord sur les produits des primes
 * anciennes, puis sur ceux taxés à 7,5 %, puis à 12,8 % ; seuil de 150 000 € de primes apprécié au 31 décembre
 * de l'année précédente, tous contrats ; prélèvements sociaux annuels sur le fonds euros, régularisés au rachat.
 */
import { config } from '../../config/defaults'
import { fiscal } from '../../config/fiscal'
import { Contract, contractHasRisk, contractRates } from '../core/contract'
import { iterateMonths, monthsBetween, parseYM, type YM } from '../core/dates'
import { amount, bool, clamp, durationMonths, num, pct, str } from '../core/params'
import { Recorder } from '../core/recorder'
import { buildSchedule } from '../core/schedule'
import type { Product, Scenario, SimParams, SimResult } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'
import { contractDefaults, contractParams } from './contractParams'

const li = fiscal.lifeInsurance

export const assuranceVie: Product = {
  id: 'assuranceVie',
  movementKinds: ['deposit', 'withdrawal'],
  params: [
    ...savingsParams({ withDuration: true }),
    ...contractParams(),
    { key: 'household', type: 'select', options: ['single', 'couple'], group: 'main' },
    { key: 'existingContract', type: 'boolean', group: 'advanced' },
    { key: 'openingDate', type: 'yearMonth', group: 'advanced', visible: (p) => bool(p, 'existingContract') },
    { key: 'existingPremiums', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced', visible: (p) => bool(p, 'existingContract') },
    { key: 'premiumsBefore2017', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced', visible: (p) => bool(p, 'existingContract') },
    { key: 'otherContractsPremiums', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced' },
    pctParam('socialRate', 'advanced', 30, 0.1),
  ],
  defaults: () => {
    const base = savingsDefaults()
    return {
      ...base,
      ...contractDefaults(config.assuranceVie),
      household: 'single',
      existingContract: false,
      openingDate: base.start,
      existingPremiums: 0,
      premiumsBefore2017: 0,
      otherContractsPremiums: 0,
      socialRate: config.assuranceVie.socialRate,
    }
  },
  hasRisk: contractHasRisk,
  simulate: simulateAssuranceVie,
}

export interface RachatTaxInput {
  /** Produits du rachat (montant racheté − quote-part des primes), éventuellement négatifs. */
  gains: number
  /** Prélèvements sociaux déjà payés sur ces produits (fonds euros), déduits lors de la régularisation. */
  socialCredit: number
  /** Part des primes du contrat versées avant le 27/09/2017. */
  preShare: number
  /** Âge du contrat en mois à la date du rachat. */
  ageMonths: number
  /** Abattement encore disponible cette année. */
  allowanceLeft: number
  /** Part des produits des primes récentes taxée à 7,5 % après 8 ans (seuil de 150 000 €). */
  reducedShare: number
  socialRate: number
}

/** Impôt et prélèvements sociaux d'un rachat (CGI art. 125-0 A ; FISCAL_RULES.md §4). */
export function rachatTax(x: RachatTaxInput) {
  const base = Math.max(0, x.gains)
  // Prélèvements sociaux : sur les produits avant prélèvements annuels, moins ceux déjà payés.
  const social = Math.max(0, (base + x.socialCredit) * x.socialRate - x.socialCredit)
  const pre = base * x.preShare
  const post = base - pre
  const pfu = fiscal.pfuIncomeTax / 100
  const reduced = li.reducedRate / 100
  if (x.ageMonths < li.yearsForReducedRate * 12) {
    const preRate = (x.ageMonths < 48 ? li.pre2017Rates.under4Years : li.pre2017Rates.from4To8Years) / 100
    return { incomeTax: pre * preRate + post * pfu, social, allowanceTaken: 0 }
  }
  const post75 = post * clamp(x.reducedShare, 0, 1)
  const post128 = post - post75
  // Abattement : produits des primes anciennes, puis produits à 7,5 %, puis à 12,8 %.
  let left = Math.max(0, x.allowanceLeft)
  const a1 = Math.min(left, pre)
  left -= a1
  const a2 = Math.min(left, post75)
  left -= a2
  const a3 = Math.min(left, post128)
  const incomeTax = (pre - a1) * (li.pre2017Rates.after8Years / 100) + (post75 - a2) * reduced + (post128 - a3) * pfu
  return { incomeTax, social, allowanceTaken: a1 + a2 + a3 }
}

/**
 * Part des produits des primes versées depuis le 27/09/2017 taxée à 7,5 % : (150 000 € − primes anciennes)
 * ÷ primes récentes, tous contrats de l'assuré, au 31 décembre de l'année précédente (BOFiP BOI-RPPM-RCM-20-15, FISCAL_RULES §4).
 */
export function reducedRateShare(premiumsTotal: number, premiumsPre: number): number {
  const post = premiumsTotal - premiumsPre
  if (post <= 0) return 1
  return clamp((li.premiumsThreshold - premiumsPre) / post, 0, 1)
}

function simulateAssuranceVie(p: SimParams, scenario: Scenario): SimResult {
  const start = parseYM(str(p, 'start'))
  const months = durationMonths(num(p, 'durationYears'))
  const existing = bool(p, 'existingContract')
  const opening: YM = existing ? parseYM(str(p, 'openingDate')) : start
  const entryFee = pct(p, 'entryFee')
  const socialRate = pct(p, 'socialRate')
  const allowance = str(p, 'household') === 'couple' ? li.allowanceCouple : li.allowanceSingle
  const otherPremiums = amount(p, 'otherContractsPremiums')

  const rates = contractRates(p, scenario)
  const contract = new Contract(rates)
  const rec = new Recorder(start)
  const sched = buildSchedule(p, months)
  if (sched.outOfRange > 0) rec.warn('movementOutOfRange', { count: sched.outOfRange })

  /** Prélèvements sociaux déjà payés sur le fonds euros, déduits lors des rachats (régularisation). */
  let socialCredit = 0
  /** Primes versées avant le 27/09/2017 restant dans le contrat. */
  let premiumsPre = 0
  let allowanceYear = start.year
  let allowanceUsed = 0

  const initial = amount(p, 'initialCapital')
  if (initial > 0) {
    // Contrat existant : le capital initial est sa valeur actuelle, sans frais sur versement.
    rec.fee(start.year, contract.deposit(initial, existing ? 0 : entryFee))
    rec.deposit(0, start.year, initial)
  }
  if (existing && initial > 0) {
    const premiums = amount(p, 'existingPremiums')
    if (premiums > 0) {
      contract.premiums = premiums
      premiumsPre = Math.min(amount(p, 'premiumsBefore2017'), premiums)
      // Plus-values latentes : les prélèvements sociaux de la part en fonds euros sont supposés déjà payés
      // (prélevés chaque année), au prorata de la répartition actuelle (hypothèse, FISCAL_RULES §4).
      const latent = initial - premiums
      if (latent > 0) socialCredit = (latent * rates.euroShare * socialRate) / (1 - socialRate)
    } else {
      rec.warn('avLatentGainsUnknown')
    }
  }
  /** Primes au 31 décembre de l'année précédente (appréciation du seuil de 150 000 €). */
  let premiumsAtLastYearEnd = contract.premiums
  let premiumsPreAtLastYearEnd = premiumsPre

  const taxOf = (gains: number, ratio: number, ageMonths: number, year: number) =>
    rachatTax({
      gains,
      socialCredit: socialCredit * ratio,
      preShare: contract.premiums > 0 ? premiumsPre / contract.premiums : 0,
      ageMonths,
      allowanceLeft: year === allowanceYear ? allowance - allowanceUsed : allowance,
      reducedShare: reducedRateShare(premiumsAtLastYearEnd + otherPremiums, premiumsPreAtLastYearEnd),
      socialRate,
    })

  /** Crédite les intérêts du fonds euros et prélève les prélèvements sociaux annuels. */
  const creditEuro = (year: number) => {
    const credited = contract.creditEuro()
    const social = Math.max(0, credited) * socialRate
    contract.euro -= social
    socialCredit += social
    rec.tax(year, social)
  }

  const startTax = taxOf(contract.value - contract.premiums, 1, monthsBetween(opening, start), start.year)
  rec.startPoint(contract.value, contract.value - startTax.incomeTax - startTax.social)

  let exitTaxes = 0
  let finalNet = contract.value

  for (const m of iterateMonths(start, months)) {
    const ym = { year: m.year, month: m.month }

    const dep = sched.deposits[m.i]
    if (dep > 0) {
      rec.fee(m.year, contract.deposit(dep, entryFee))
      rec.deposit(m.i, m.year, dep)
    }

    const wanted = sched.withdrawals[m.i]
    if (wanted > 0) {
      creditEuro(m.year)
      const v = contract.value
      const taken = Math.min(wanted, v)
      if (taken < wanted) rec.warn('withdrawalCapped')
      const ratio = v > 0 ? taken / v : 0
      const premiumsBefore = contract.premiums
      const gains = taken - premiumsBefore * ratio
      const t = taxOf(gains, ratio, monthsBetween(opening, ym), m.year)
      contract.withdraw(taken)
      // Contrat en perte (valeur < primes non remboursées) : la part de primes remboursée est plafonnée au montant
      // racheté (BOFiP BOI-RPPM-RCM-20-10-20-50 §100, RES 2010/46) ; le produit est nul et les primes restantes ne
      // baissent que du montant racheté. Sinon : primes × montant racheté ÷ valeur.
      const reimbursed = gains < 0 ? taken : premiumsBefore * ratio
      contract.premiums = premiumsBefore - reimbursed
      socialCredit -= socialCredit * ratio
      premiumsPre -= premiumsBefore > 0 ? premiumsPre * (reimbursed / premiumsBefore) : 0
      if (m.year !== allowanceYear) {
        allowanceYear = m.year
        allowanceUsed = 0
      }
      allowanceUsed += t.allowanceTaken
      rec.tax(m.year, t.incomeTax + t.social)
      rec.withdraw(m.i, m.year, taken, taken - t.incomeTax - t.social)
    }

    const g = contract.grow()
    rec.gain(m.year, g.gain)
    rec.fee(m.year, g.fee)

    if (m.isYearEnd) {
      creditEuro(m.year)
      const v = contract.value
      // Valeur nette en cas de rachat total à la fin du mois (hypothèse de lecture).
      const t = taxOf(v - contract.premiums, 1, monthsBetween(opening, ym) + 1, m.year)
      const taxes = t.incomeTax + t.social
      rec.close(m.i, m.year, v, v - taxes)
      if (m.isLast) {
        exitTaxes = taxes
        finalNet = v - taxes
      }
      if (m.month === 12) {
        premiumsAtLastYearEnd = contract.premiums
        premiumsPreAtLastYearEnd = premiumsPre
      }
    }
  }

  return rec.finish({
    months,
    finalGross: contract.value,
    finalNet,
    exitTaxes,
    netFinalFlow: finalNet,
  })
}
