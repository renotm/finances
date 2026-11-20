import { config } from '../../config/defaults'
import { Contract, contractHasRisk, contractRates } from '../core/contract'
import { addMonths, iterateMonths, parseYM } from '../core/dates'
import { amount, bool, clamp, num, pct, str } from '../core/params'
import { Recorder } from '../core/recorder'
import { buildSchedule } from '../core/schedule'
import type { ParamAction, ParamDef, ParamPatch, Product, Scenario, SimParams, SimResult } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'
import { contractDefaults, contractParams } from './contractParams'

const c = config.per
const a = c.annuity

/** Durée maximale de la phase de versement (garde-fou). */
const MAX_PAYOUT_MONTHS = 70 * 12

const paysAnnuity = (p: SimParams) => p.exitMode !== 'capital'
const tableMethod = (p: SimParams) => paysAnnuity(p) && p.annuityMethod !== 'conversion'

/** Plafond annuel de déduction : saisi directement, sinon 10 % des revenus borné, sinon le plancher. */
export function perCeiling(p: SimParams): number {
  const override = amount(p, 'ceilingOverride')
  if (override > 0) return override
  const income = amount(p, 'income')
  if (income <= 0) return c.ceilingFloor
  return clamp((income * c.ceilingRate) / 100, c.ceilingFloor, c.ceilingMax)
}

/** Bouton « Max » : versement régulier égal au plafond de déduction de l'année (SPEC §4.4.3). */
export const maxDeductible: ParamAction = {
  id: 'maxDeductible',
  visible: (p) => bool(p, 'deducted'),
  apply: (p) => ({
    periodicAmount: str(p, 'frequency') === 'yearly' ? Math.floor(perCeiling(p)) : Math.floor(perCeiling(p) / 12),
  }),
  hint: (p) => ({
    key: str(p, 'frequency') === 'yearly' ? 'hintYearly' : 'hintMonthly',
    amounts: { amount: Math.floor(perCeiling(p) / 12), ceiling: Math.round(perCeiling(p)) },
  }),
}

// ---------- Report des plafonds non utilisés (SPEC §4.4.4) ----------

/** Champs des plafonds non utilisés saisis : années N−1, N−2, N−3 (N = année de début). */
const CARRY_KEYS = ['carryN1', 'carryN2', 'carryN3'] as const

/** Dernière année où un plafond non utilisé de l'année `origin` peut servir : 3 ans jusqu'à 2025, 5 ans ensuite. */
export function carryLastYear(origin: number): number {
  return origin + (origin <= c.carryRuleChangeYear - 1 ? c.carryYearsBefore : c.carryYearsAfter)
}

/** Plafonds non utilisés saisis, du plus ancien au plus récent. */
function initialCarries(p: SimParams): { origin: number; amount: number; entered: true }[] {
  const startYear = parseYM(str(p, 'start')).year
  return CARRY_KEYS.map((key, k) => ({ origin: startYear - 1 - k, amount: amount(p, key), entered: true as const }))
    .filter((x) => x.amount > 0)
    .reverse()
}

const carryTotal = (p: SimParams) => CARRY_KEYS.reduce((acc, key) => acc + amount(p, key), 0)

/** Versements réguliers et ponctuels déjà prévus pendant la première année civile (hors versement initial). */
function firstYearPlannedDeposits(p: SimParams): number {
  const start = parseYM(str(p, 'start'))
  const periodic = amount(p, 'periodicAmount')
  const regular = str(p, 'frequency') === 'yearly' ? periodic : periodic * (12 - start.month + 1)
  const oneOff = p.movements
    .filter((m) => m.kind === 'deposit' && parseYM(m.date).year === start.year && parseYM(m.date).month >= start.month)
    .reduce((acc, m) => acc + Math.max(0, Number(m.amount) || 0), 0)
  return regular + oneOff
}

/** Maximum déductible la première année en versement initial : plafond + report − versements déjà prévus. */
export function firstYearMaxInitial(p: SimParams): number {
  return Math.max(0, Math.floor(perCeiling(p) + carryTotal(p) - firstYearPlannedDeposits(p)))
}

/** Bouton « Utiliser le report » : versement initial = maximum déductible la première année (SPEC §4.4.4). */
export const useCarryForward: ParamAction = {
  id: 'useCarryForward',
  visible: (p) => bool(p, 'deducted') && carryTotal(p) > 0,
  apply: (p): ParamPatch => ({ initialCapital: firstYearMaxInitial(p) }),
  hint: (p) => ({
    key: 'hint',
    amounts: { amount: firstYearMaxInitial(p), carry: Math.round(carryTotal(p)) },
  }),
}

/** Bouton « Estimer » : plafonds non utilisés supposés entiers (personne n'ayant jamais versé sur un PER). */
export const estimateCarry: ParamAction = {
  id: 'estimateCarry',
  visible: (p) => bool(p, 'deducted'),
  apply: (p) => {
    const ceiling = Math.round(perCeiling(p))
    return { carryN1: ceiling, carryN2: ceiling, carryN3: ceiling }
  },
}

const carryParam = (key: (typeof CARRY_KEYS)[number], offset: number, actions?: ParamAction[]): ParamDef => ({
  key,
  type: 'number',
  unit: 'eur',
  min: 0,
  step: 100,
  group: 'advanced',
  visible: (p) => bool(p, 'deducted'),
  labelParams: (p) => ({ year: parseYM(str(p, 'start')).year - offset }),
  actions,
})

export function annuityTaxableFraction(age: number): number {
  const row = c.annuityTaxableFractions.find((r) => age <= r.maxAge)
  return (row?.fraction ?? 30) / 100
}

/**
 * Montant de la rente (SPEC §4.4.1). L'espérance de vie ne sert qu'au calcul : la rente est viagère.
 * Table non garantie : l'espérance de vie progresse jusqu'à la retraite.
 */
export function annuityTerms(p: SimParams, converted: number, yearsToRetirement: number, retirementAge: number) {
  const lifeToday = num(p, 'lifeExpectancy')
  const gain = (num(p, 'lifeGainPerDecade') / 10) * Math.max(0, yearsToRetirement)
  const byTable = p.annuityMethod !== 'conversion'
  const guaranteed = bool(p, 'tableGuaranteed') && byTable
  const t = pct(p, 'technicalRate')
  const fee = clamp(pct(p, 'arrearsFee'), 0, 1)

  const rawYears = lifeToday + (guaranteed ? 0 : gain) - retirementAge
  const calcYears = Math.max(1, rawYears)
  const factor = (n: number) => (Math.abs(t) < 1e-12 ? 1 / n : t / (1 - Math.pow(1 + t, -n)))

  const grossYearly = byTable ? converted * factor(calcYears) * (1 - fee) : converted * pct(p, 'conversionRate') * (1 - fee)
  const guaranteedGrossYearly =
    byTable && !guaranteed ? converted * factor(Math.max(1, lifeToday - retirementAge)) * (1 - fee) : null

  return { grossYearly, guaranteedGrossYearly, calcYears, calcAge: retirementAge + calcYears, tooShort: rawYears < 1 }
}

const savings: ParamDef[] = savingsParams({ withDuration: false }).map((d) => {
  if (d.key === 'initialCapital') return { ...d, labelKey: 'params.initialDeposit', actions: [useCarryForward] }
  if (d.key === 'periodicAmount') return { ...d, actions: [maxDeductible] }
  return d
})

export const per: Product = {
  id: 'per',
  // Retraits interdits avant la retraite, sauf déblocage anticipé (résidence principale).
  movementKinds: ['deposit', 'earlyRelease'],
  params: [
    { key: 'currentAge', type: 'number', unit: 'age', min: 18, max: 80, step: 1, group: 'main' },
    { key: 'retirementAge', type: 'number', unit: 'age', min: 50, max: 80, step: 1, group: 'main' },
    ...savings,
    { key: 'deducted', type: 'boolean', group: 'main' },
    { key: 'tmiNow', type: 'select', unit: 'pct', options: config.tmiOptions, group: 'main' },
    { key: 'tmiRetirement', type: 'select', unit: 'pct', options: config.tmiOptions, group: 'main' },
    { key: 'exitMode', type: 'select', options: ['capital', 'annuity', 'mixed'], group: 'main' },
    { ...pctParam('capitalShare', 'main', 100, 5), visible: (p) => p.exitMode === 'mixed' },
    { key: 'annuityMethod', type: 'select', options: ['table', 'conversion'], group: 'main', visible: paysAnnuity },
    { key: 'lifeExpectancy', type: 'number', unit: 'age', min: 60, max: 110, step: 0.5, group: 'main', visible: paysAnnuity },
    { key: 'tableGuaranteed', type: 'boolean', group: 'main', visible: tableMethod },
    { ...pctParam('conversionRate', 'main', 15, 0.1), visible: (p) => paysAnnuity(p) && !tableMethod(p) },
    { key: 'endAge', type: 'number', unit: 'age', min: 0, max: 120, step: 1, group: 'main', visible: paysAnnuity },
    ...contractParams(),
    { key: 'income', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    { key: 'ceilingOverride', type: 'number', unit: 'eur', min: 0, step: 100, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    carryParam('carryN1', 1, [estimateCarry]),
    carryParam('carryN2', 2),
    carryParam('carryN3', 3),
    {
      key: 'lifeGainPerDecade',
      type: 'number',
      unit: 'yearsPerDecade',
      min: 0,
      max: 5,
      step: 0.1,
      group: 'advanced',
      visible: (p) => paysAnnuity(p) && !(tableMethod(p) && bool(p, 'tableGuaranteed')),
    },
    { ...pctParam('technicalRate', 'advanced', 5, 0.1), visible: tableMethod },
    { ...pctParam('arrearsFee', 'advanced', 10, 0.1), visible: paysAnnuity },
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
    annuityMethod: 'table',
    lifeExpectancy: a.lifeExpectancy,
    tableGuaranteed: false,
    lifeGainPerDecade: a.lifeGainPerDecade,
    technicalRate: a.technicalRate,
    arrearsFee: a.arrearsFee,
    conversionRate: a.conversionRate,
    endAge: 0,
    ...contractDefaults(c),
    income: 0,
    ceilingOverride: 0,
    carryN1: 0,
    carryN2: 0,
    carryN3: 0,
    socialRate: c.socialRate,
  }),
  hasRisk: contractHasRisk,
  simulate: simulatePer,
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

  /** Plafonds non utilisés encore valides, du plus ancien au plus récent. */
  let carries: { origin: number; amount: number; entered: boolean }[] = initialCarries(p)
  let carryUsed = 0
  /** Plafonds saisis par l'utilisateur et perdus faute d'avoir servi. */
  let carryLost = 0

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

  // ---------- Phase d'épargne, jusqu'à la retraite ----------
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

    if (deducted) {
      // Imputation : d'abord le plafond de l'année, puis les reports du plus ancien au plus récent.
      const fromCurrent = Math.min(yearDeposits, ceiling)
      let rest = yearDeposits - fromCurrent
      let fromCarry = 0
      for (const cf of carries) {
        if (rest <= 0) break
        const take = Math.min(rest, cf.amount)
        cf.amount -= take
        rest -= take
        fromCarry += take
      }
      carryUsed += fromCarry
      if (rest > 0.005) yearsAboveCeiling.push(m.year)

      // La part non utilisée du plafond de l'année devient reportable ; les reports échus disparaissent.
      if (ceiling - fromCurrent > 0.005) carries.push({ origin: m.year, amount: ceiling - fromCurrent, entered: false })
      for (const cf of carries) {
        if (cf.entered && carryLastYear(cf.origin) <= m.year && cf.amount > 0.005) carryLost += cf.amount
      }
      carries = carries.filter((cf) => carryLastYear(cf.origin) > m.year && cf.amount > 0.005)

      const deductible = Math.min(fromCurrent + fromCarry, freePremiums)
      if (deductible > 0) {
        deductedPremiums += deductible
        freePremiums -= deductible
        const saving = deductible * tmiNow
        savingsTotal += saving
        rec.saving(m.i, m.year, saving)
      }
    }
    yearDeposits = 0

    // Valeur nette si l'on sortait tout en capital à cette date.
    const v = contract.value
    rec.close(m.i, m.year, v, v - capitalTax(v, 1, tmiRetirement) + savingsTotal)
  }

  if (yearsAboveCeiling.length > 0) {
    rec.warn('perCeilingExceeded', { count: yearsAboveCeiling.length, first: yearsAboveCeiling[0] })
  }
  if (carryLost > 0.5) rec.warn('perCarryExpired', { amount: Math.round(carryLost) })
  const extraLines = carryUsed > 0.5 ? [{ key: 'carryUsed', amount: carryUsed }] : undefined

  // ---------- Sortie à la retraite ----------
  const lastI = months - 1
  const retirementYear = addMonths(start, lastI).year
  const v = contract.value
  const mode = str(p, 'exitMode')
  const share = mode === 'capital' ? 1 : mode === 'annuity' ? 0 : clamp(pct(p, 'capitalShare'), 0, 1)
  const capitalGross = v * share
  const capitalTaxes = share > 0 ? capitalTax(capitalGross, share, tmiRetirement) : 0
  const converted = v - capitalGross

  // Fiscalité de la rente : barème après abattement de 10 % sur la part issue de versements déduits,
  // fraction imposable selon l'âge (rentes viagères à titre onéreux) sur le reste et pour les prélèvements sociaux.
  const premiums = deductedPremiums + freePremiums
  const deductedShare = premiums > 0 ? deductedPremiums / premiums : 0
  const fraction = annuityTaxableFraction(retirementAge)
  const annuityTax = (gross: number) =>
    gross * deductedShare * (1 - c.pensionAllowance / 100) * tmiRetirement +
    gross * (1 - deductedShare) * fraction * tmiRetirement +
    gross * fraction * socialRate

  // En sortie capital, la rente est calculée sur tout le capital, à titre de comparaison.
  const terms = annuityTerms(p, mode === 'capital' ? v : converted, months / 12, retirementAge)
  const netYearly = terms.grossYearly - annuityTax(terms.grossYearly)
  const reference = mode === 'capital' ? v : converted
  const annuityBase = {
    grossYearly: terms.grossYearly,
    netYearly,
    calcYears: terms.calcYears,
    calcAge: terms.calcAge,
    guaranteedNetYearly:
      terms.guaranteedGrossYearly === null ? null : terms.guaranteedGrossYearly - annuityTax(terms.guaranteedGrossYearly),
    breakEvenAge: netYearly > 0 ? retirementAge + reference / netYearly : null,
  }

  if (mode === 'capital') {
    const finalNet = v - capitalTaxes + savingsTotal
    return rec.finish({
      months,
      finalGross: v,
      finalNet,
      exitTaxes: capitalTaxes,
      netFinalFlow: v - capitalTaxes,
      annuity: { ...annuityBase, indicative: true, endAge: null, totalNet: null },
      extraLines,
    })
  }

  if (terms.tooShort) rec.warn('perLifeExpectancyTooLow')

  // Part en capital versée à la retraite.
  if (capitalGross > 0) {
    rec.tax(retirementYear, capitalTaxes)
    rec.withdraw(lastI + 1, retirementYear, capitalGross, capitalGross - capitalTaxes)
  }

  // ---------- Phase de versement de la rente, jusqu'à l'âge de fin de simulation ----------
  const endAgeParam = num(p, 'endAge')
  const endAge = endAgeParam > 0 ? endAgeParam : terms.calcAge
  let payoutMonths = Math.round((endAge - retirementAge) * 12)
  if (payoutMonths <= 0) {
    rec.warn('perEndAgeBeforeRetirement')
    payoutMonths = 0
  }
  payoutMonths = Math.min(payoutMonths, MAX_PAYOUT_MONTHS)

  const monthlyGross = terms.grossYearly / 12
  const monthlyTax = annuityTax(terms.grossYearly) / 12
  let cumGross = capitalGross
  let cumNet = capitalGross - capitalTaxes

  for (let k = 0; k < payoutMonths; k++) {
    const i = months + k
    const ym = addMonths(start, i)
    rec.annuity(i, ym.year, monthlyGross, monthlyTax)
    cumGross += monthlyGross
    cumNet += monthlyGross - monthlyTax
    if (ym.month === 12 || k === payoutMonths - 1) rec.close(i, ym.year, cumGross, cumNet + savingsTotal)
  }

  return rec.finish({
    months: months + payoutMonths,
    finalGross: cumGross,
    finalNet: cumNet + savingsTotal,
    exitTaxes: 0,
    netFinalFlow: 0,
    grossFinalFlow: 0,
    annuity: {
      ...annuityBase,
      indicative: false,
      endAge: retirementAge + payoutMonths / 12,
      totalNet: (monthlyGross - monthlyTax) * payoutMonths,
    },
    extraLines,
  })
}
