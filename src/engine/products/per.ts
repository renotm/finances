import { config } from '../../config/defaults'
import { Contract, contractHasRisk, contractRates } from '../core/contract'
import { iterateMonths, parseYM } from '../core/dates'
import { amount, bool, clamp, num, pct, str } from '../core/params'
import { Recorder } from '../core/recorder'
import { buildSchedule } from '../core/schedule'
import type { Annuity, Product, Scenario, SimParams, SimResult } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'
import { contractDefaults, contractParams } from './contractParams'

const c = config.per

export const per: Product = {
  id: 'per',
  // Retraits interdits avant la retraite, sauf déblocage anticipé (résidence principale).
  movementKinds: ['deposit', 'earlyRelease'],
  params: [
    { key: 'currentAge', type: 'number', unit: 'age', min: 18, max: 80, step: 1, group: 'main' },
    { key: 'retirementAge', type: 'number', unit: 'age', min: 50, max: 80, step: 1, group: 'main' },
    ...savingsParams({ withDuration: false }),
    { key: 'deducted', type: 'boolean', group: 'main' },
    { key: 'tmiNow', type: 'select', unit: 'pct', options: config.tmiOptions, group: 'main' },
    { key: 'tmiRetirement', type: 'select', unit: 'pct', options: config.tmiOptions, group: 'main' },
    { key: 'exitMode', type: 'select', options: ['capital', 'annuity', 'mixed'], group: 'main' },
    { ...pctParam('capitalShare', 'main', 100, 5), visible: (p) => p.exitMode === 'mixed' },
    ...contractParams(),
    { key: 'income', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    { key: 'ceilingOverride', type: 'number', unit: 'eur', min: 0, step: 100, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    { ...pctParam('conversionRate', 'advanced', 15, 0.1), visible: (p) => p.exitMode !== 'capital' },
    pctParam('socialRate', 'advanced', 30, 0.1),
  ],
  defaults: () => ({
    ...savingsDefaults(),
    currentAge: c.currentAge,
    retirementAge: c.retirementAge,
    deducted: true,
    tmiNow: c.tmiNow,
    tmiRetirement: c.tmiRetirement,
    exitMode: 'capital',
    capitalShare: c.capitalShare,
    ...contractDefaults(c),
    income: 0,
    ceilingOverride: 0,
    conversionRate: c.conversionRate,
    socialRate: c.socialRate,
  }),
  hasRisk: contractHasRisk,
  simulate: simulatePer,
}

/** Plafond annuel de déduction : saisi directement, sinon 10 % des revenus borné, sinon le plancher. */
export function perCeiling(p: SimParams): number {
  const override = amount(p, 'ceilingOverride')
  if (override > 0) return override
  const income = amount(p, 'income')
  if (income <= 0) return c.ceilingFloor
  return clamp((income * c.ceilingRate) / 100, c.ceilingFloor, c.ceilingMax)
}

export function annuityTaxableFraction(age: number): number {
  const row = c.annuityTaxableFractions.find((r) => age <= r.maxAge)
  return (row?.fraction ?? 30) / 100
}

function simulatePer(p: SimParams, scenario: Scenario): SimResult {
  const start = parseYM(str(p, 'start'))
  const currentAge = num(p, 'currentAge')
  const retirementAge = num(p, 'retirementAge')
  const rec = new Recorder(start)
  let months = Math.round((retirementAge - currentAge) * 12)
  if (months <= 0) {
    rec.warn('perInvalidAges')
    months = 12
  }
  months = Math.min(months, 720)

  const deducted = bool(p, 'deducted')
  const tmiNow = pct(p, 'tmiNow')
  const tmiRetirement = pct(p, 'tmiRetirement')
  const entryFee = pct(p, 'entryFee')
  const socialRate = pct(p, 'socialRate')
  const pfu = config.pfuIncomeTax / 100
  const ceiling = perCeiling(p)

  const contract = new Contract(contractRates(p, scenario))
  const sched = buildSchedule(p, months)
  if (sched.outOfRange > 0) rec.warn('movementOutOfRange', { count: sched.outOfRange })

  /** Versements déduits / non déduits restant dans le contrat. */
  let deductedPremiums = 0
  let freePremiums = 0
  let yearDeposits = 0
  let savingsTotal = 0
  const yearsAboveCeiling: number[] = []

  /** Fiscalité d'une sortie en capital d'une fraction `ratio` du contrat. */
  const capitalTax = (value: number, ratio: number, tmi: number) => {
    const fromDeducted = deductedPremiums * ratio
    const gains = Math.max(0, value - (deductedPremiums + freePremiums) * ratio)
    return fromDeducted * tmi + gains * (pfu + socialRate)
  }

  const deposit = (i: number, year: number, v: number) => {
    if (v <= 0) return
    rec.fee(year, contract.deposit(v, entryFee))
    rec.deposit(i, year, v)
    freePremiums += v // reclassé en « déduit » en fin d'année, dans la limite du plafond
    yearDeposits += v
  }

  // Le capital initial compte comme un versement de la première année.
  deposit(0, start.year, amount(p, 'initialCapital'))
  rec.startPoint(contract.value, contract.value)

  let annuity: Annuity | undefined
  let finalNet = contract.value
  let exitTaxes = 0
  let netFinalFlow = contract.value

  for (const m of iterateMonths(start, months)) {
    deposit(m.i, m.year, sched.deposits[m.i])

    const wanted = sched.earlyReleases[m.i]
    if (wanted > 0) {
      contract.creditEuro()
      const v = contract.value
      const ratio = v > 0 ? Math.min(wanted, v) / v : 0
      const tax = capitalTax(Math.min(wanted, v), ratio, tmiNow)
      const w = contract.withdraw(wanted)
      if (w.amount < wanted) rec.warn('withdrawalCapped')
      deductedPremiums *= 1 - ratio
      freePremiums *= 1 - ratio
      yearDeposits *= 1 - ratio
      rec.tax(m.year, tax)
      rec.withdraw(m.i, m.year, w.amount, w.amount - tax)
    }

    const g = contract.grow()
    rec.gain(m.year, g.gain)
    rec.fee(m.year, g.fee)

    if (!m.isYearEnd) continue
    contract.creditEuro()

    if (deducted && yearDeposits > 0) {
      const deductible = Math.min(yearDeposits, ceiling, freePremiums)
      deductedPremiums += deductible
      freePremiums -= deductible
      const saving = deductible * tmiNow
      savingsTotal += saving
      rec.saving(m.i, m.year, saving)
      if (yearDeposits > ceiling + 0.005) yearsAboveCeiling.push(m.year)
    }
    yearDeposits = 0

    const v = contract.value
    if (!m.isLast) {
      rec.close(m.i, m.year, v, v - capitalTax(v, 1, tmiRetirement) + savingsTotal)
      continue
    }

    // Sortie à la retraite : capital, rente ou mixte.
    const mode = str(p, 'exitMode')
    const share = mode === 'capital' ? 1 : mode === 'annuity' ? 0 : clamp(pct(p, 'capitalShare'), 0, 1)
    const capitalTaxes = share > 0 ? capitalTax(v * share, share, tmiRetirement) : 0
    const converted = v * (1 - share)
    let annuityNetValue = 0
    let annuityTaxValue = 0

    if (converted > 0) {
      const grossYearly = converted * pct(p, 'conversionRate')
      const premiums = deductedPremiums + freePremiums
      const deductedShare = premiums > 0 ? deductedPremiums / premiums : 0
      const fraction = annuityTaxableFraction(retirementAge)
      const fromDeducted = grossYearly * deductedShare
      const fromFree = grossYearly - fromDeducted
      const incomeTax =
        fromDeducted * (1 - c.pensionAllowance / 100) * tmiRetirement + fromFree * fraction * tmiRetirement
      const social = grossYearly * fraction * socialRate
      const netYearly = grossYearly - incomeTax - social
      annuity = { grossYearly, netYearly, breakEvenYears: netYearly > 0 ? converted / netYearly : null }
      // Pour comparer avec un capital, le capital converti est valorisé au ratio net / brut de la rente.
      annuityNetValue = grossYearly > 0 ? converted * (netYearly / grossYearly) : converted
      annuityTaxValue = converted - annuityNetValue
    }

    exitTaxes = capitalTaxes + annuityTaxValue
    netFinalFlow = v * share - capitalTaxes + annuityNetValue
    finalNet = netFinalFlow + savingsTotal
    rec.close(m.i, m.year, v, finalNet)
  }

  if (yearsAboveCeiling.length > 0) {
    rec.warn('perCeilingExceeded', {
      count: yearsAboveCeiling.length,
      first: yearsAboveCeiling[0],
      ceiling: Math.round(ceiling),
    })
  }

  return rec.finish({
    months,
    finalGross: contract.value,
    finalNet,
    exitTaxes,
    netFinalFlow,
    annuity,
  })
}
