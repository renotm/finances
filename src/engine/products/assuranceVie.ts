import { config } from '../../config/defaults'
import { fiscal } from '../../config/fiscal'
import { Contract, contractHasRisk, contractRates } from '../core/contract'
import { iterateMonths, monthsBetween, parseYM, type YM } from '../core/dates'
import { amount, bool, durationMonths, num, pct, str } from '../core/params'
import { Recorder } from '../core/recorder'
import { buildSchedule } from '../core/schedule'
import type { Product, Scenario, SimParams, SimResult } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'
import { contractDefaults, contractParams } from './contractParams'

const c = { ...config.assuranceVie, ...fiscal.lifeInsurance }

export const assuranceVie: Product = {
  id: 'assuranceVie',
  movementKinds: ['deposit', 'withdrawal'],
  params: [
    ...savingsParams({ withDuration: true }),
    ...contractParams(),
    { key: 'household', type: 'select', options: ['single', 'couple'], group: 'main' },
    { key: 'existingContract', type: 'boolean', group: 'advanced' },
    { key: 'openingDate', type: 'yearMonth', group: 'advanced', visible: (p) => bool(p, 'existingContract') },
    pctParam('socialRate', 'advanced', 30, 0.1),
  ],
  defaults: () => {
    const base = savingsDefaults()
    return {
      ...base,
      ...contractDefaults(c),
      household: 'single',
      existingContract: false,
      openingDate: base.start,
      socialRate: c.socialRate,
    }
  },
  hasRisk: contractHasRisk,
  simulate: simulateAssuranceVie,
}

function simulateAssuranceVie(p: SimParams, scenario: Scenario): SimResult {
  const start = parseYM(str(p, 'start'))
  const months = durationMonths(num(p, 'durationYears'))
  const existing = bool(p, 'existingContract')
  const opening: YM = existing ? parseYM(str(p, 'openingDate')) : start
  const entryFee = pct(p, 'entryFee')
  const socialRate = pct(p, 'socialRate')
  const pfu = fiscal.pfuIncomeTax / 100
  const reduced = c.reducedRate / 100
  const allowance = str(p, 'household') === 'couple' ? c.allowanceCouple : c.allowanceSingle

  const contract = new Contract(contractRates(p, scenario))
  const rec = new Recorder(start)
  const sched = buildSchedule(p, months)
  if (sched.outOfRange > 0) rec.warn('movementOutOfRange', { count: sched.outOfRange })

  /** Prélèvements sociaux déjà payés sur le fonds euros, déduits lors des rachats (régularisation). */
  let socialCredit = 0
  let allowanceYear = start.year
  let allowanceUsed = 0

  /**
   * Fiscalité d'un rachat. La base imposable est la part de gains avant prélèvements sociaux annuels
   * (gains nets + prélèvements déjà payés sur cette part).
   */
  const rachatTax = (gainsPart: number, ratio: number, ageMonths: number, year: number, premiumsBefore: number) => {
    const credit = socialCredit * ratio
    const grossGains = Math.max(0, gainsPart + credit)
    const social = Math.max(0, grossGains * socialRate - credit)
    let incomeTax: number
    let allowanceTaken = 0
    if (ageMonths < c.yearsForReducedRate * 12) {
      incomeTax = grossGains * pfu
    } else {
      const remaining = year === allowanceYear ? Math.max(0, allowance - allowanceUsed) : allowance
      allowanceTaken = Math.min(remaining, grossGains)
      const taxable = grossGains - allowanceTaken
      const share = premiumsBefore > c.premiumsThreshold ? c.premiumsThreshold / premiumsBefore : 1
      incomeTax = taxable * (share * reduced + (1 - share) * pfu)
    }
    return { incomeTax, social, credit, allowanceTaken }
  }

  /** Crédite les intérêts du fonds euros et prélève les prélèvements sociaux annuels. */
  const creditEuro = (year: number) => {
    const credited = contract.creditEuro()
    const social = Math.max(0, credited) * socialRate
    contract.euro -= social
    socialCredit += social
    rec.tax(year, social)
  }

  const initial = amount(p, 'initialCapital')
  if (initial > 0) {
    // Contrat existant : le capital initial est déjà investi, pas de frais sur versement.
    rec.fee(start.year, contract.deposit(initial, existing ? 0 : entryFee))
    rec.deposit(0, start.year, initial)
  }
  rec.startPoint(contract.value, contract.value)

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
      const premiumsBefore = contract.premiums
      const w = contract.withdraw(wanted)
      if (w.amount < wanted) rec.warn('withdrawalCapped')
      const t = rachatTax(w.gainsPart, w.ratio, monthsBetween(opening, ym), m.year, premiumsBefore)
      socialCredit -= t.credit
      if (m.year !== allowanceYear) {
        allowanceYear = m.year
        allowanceUsed = 0
      }
      allowanceUsed += t.allowanceTaken
      rec.tax(m.year, t.incomeTax + t.social)
      rec.withdraw(m.i, m.year, w.amount, w.amount - t.incomeTax - t.social)
    }

    const g = contract.grow()
    rec.gain(m.year, g.gain)
    rec.fee(m.year, g.fee)

    if (m.isYearEnd) {
      creditEuro(m.year)
      const v = contract.value
      const t = rachatTax(v - contract.premiums, 1, monthsBetween(opening, ym) + 1, m.year, contract.premiums)
      const taxes = t.incomeTax + t.social
      rec.close(m.i, m.year, v, v - taxes)
      if (m.isLast) {
        exitTaxes = taxes
        finalNet = v - taxes
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
