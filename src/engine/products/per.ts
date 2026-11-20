/**
 * Plan d'épargne retraite (SPEC §4.4, FISCAL_RULES.md §3).
 *
 * La fiscalité repose sur le moteur d'impôt commun quand un contexte fiscal est disponible (profil complet) :
 * économie d'impôt réelle des versements, sortie en capital au barème avec le système du quotient, rente
 * imposée avec l'abattement plafonné. Sans contexte, une TMI fixe est appliquée et les résultats sont signalés
 * comme approximatifs.
 */
import { config } from '../../config/defaults'
import { fiscal } from '../../config/fiscal'
import { Contract, contractHasRisk, contractRates } from '../core/contract'
import { addMonths, iterateMonths, parseYM } from '../core/dates'
import { amount, bool, clamp, num, pct, str } from '../core/params'
import { Recorder } from '../core/recorder'
import { buildSchedule } from '../core/schedule'
import { tmiAt, tmiParam } from '../core/tmi'
import { composition, taxContext } from '../tax/context'
import { deductionSaving, exceptionalIncomeTax, extraTax, taxablePensionIncrement } from '../tax/incomeTax'
import type { ParamAction, ParamDef, ParamPatch, Product, Scenario, SimParams, SimResult, TaxContext } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'
import { contractDefaults, contractParams } from './contractParams'

const d = config.per
const f = fiscal.per

/** Durée maximale de la phase de versement (garde-fou). */
const MAX_PAYOUT_MONTHS = 70 * 12

const paysAnnuity = (p: SimParams) => p.exitMode !== 'capital'
const tableMethod = (p: SimParams) => paysAnnuity(p) && p.annuityMethod !== 'conversion'

// ---------- Plafond de déduction ----------

/**
 * Plafond annuel de déduction : saisi depuis l'avis d'impôt (zéro accepté), sinon 10 % des revenus professionnels
 * bornés, sinon le plancher. Un ancien paramètre `ceilingOverride` > 0 sans `ceilingManual` reste un plafond saisi.
 */
export function perCeiling(p: SimParams): number {
  const override = amount(p, 'ceilingOverride')
  if (bool(p, 'ceilingManual') || override > 0) return override
  const income = amount(p, 'income')
  if (income <= 0) return f.ceilingFloor
  return clamp((income * f.ceilingRate) / 100, f.ceilingFloor, f.ceilingMax)
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

/** Plafonds non utilisés saisis : années N−1 à N−5 (N = année de début), selon leur durée de validité. */
const CARRY_KEYS = ['carryN1', 'carryN2', 'carryN3', 'carryN4', 'carryN5'] as const
type CarryKey = (typeof CARRY_KEYS)[number]

/** Dernière année où un plafond non utilisé de l'année `origin` peut servir : 3 ans jusqu'à 2025, 5 ans ensuite. */
export function carryLastYear(origin: number): number {
  return origin + (origin < f.carryRuleChangeYear ? f.carryYearsBefore : f.carryYearsAfter)
}

/** Un champ de report n'a de sens que si le plafond de cette année d'origine est encore utilisable au début. */
function carryUsable(p: SimParams, offset: number): boolean {
  const startYear = parseYM(str(p, 'start')).year
  return carryLastYear(startYear - offset) >= startYear
}

/** Plafonds non utilisés saisis et encore valides, du plus ancien au plus récent. */
function initialCarries(p: SimParams): { origin: number; amount: number; entered: boolean }[] {
  const startYear = parseYM(str(p, 'start')).year
  return CARRY_KEYS.map((key, k) => ({ origin: startYear - 1 - k, amount: carryUsable(p, k + 1) ? amount(p, key) : 0, entered: true }))
    .filter((x) => x.amount > 0)
    .reverse()
}

const carryTotal = (p: SimParams) => initialCarries(p).reduce((acc, c) => acc + c.amount, 0)

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
    const patch: ParamPatch = {}
    CARRY_KEYS.forEach((key, k) => {
      if (carryUsable(p, k + 1)) patch[key] = ceiling
    })
    return patch
  },
}

const carryParam = (key: CarryKey, offset: number, actions?: ParamAction[]): ParamDef => ({
  key,
  type: 'number',
  unit: 'eur',
  min: 0,
  step: 100,
  group: 'advanced',
  visible: (p) => bool(p, 'deducted') && carryUsable(p, offset),
  labelParams: (p) => ({ year: parseYM(str(p, 'start')).year - offset }),
  actions,
})

// ---------- Rente viagère (SPEC §4.4.1) ----------

/** Fraction imposable des rentes viagères à titre onéreux selon l'âge (en années révolues) à l'entrée en jouissance. */
export function annuityTaxableFraction(age: number): number {
  const years = Math.floor(age + 1e-9)
  const row = f.annuityTaxableFractions.find((r) => years <= r.maxAge)
  return (row?.fraction ?? 30) / 100
}

/** Prix d'un euro de rente annuelle (table TGF05, taux technique 0 %), interpolé entre deux âges entiers. */
export function tgf05Price(age: number): { price: number; outOfTable: boolean } {
  const ages = Object.keys(fiscal.tgf05AnnuityPrices.byAge).map(Number).sort((x, y) => x - y)
  const min = ages[0]
  const max = ages[ages.length - 1]
  const a = clamp(age, min, max)
  const lo = Math.floor(a)
  const hi = Math.min(max, lo + 1)
  const prices = fiscal.tgf05AnnuityPrices.byAge
  const price = lo === hi ? prices[lo] : prices[lo] + (prices[hi] - prices[lo]) * (a - lo)
  return { price, outOfTable: age < min || age > max }
}

/**
 * Rente annuelle brute (après frais sur arrérages).
 * - Méthode « table » : capital ÷ prix d'un euro de rente (TGF05, 0 %). Table non garantie : les tables futures
 *   reflètent la hausse de l'espérance de vie, modélisée par un décalage d'âge (hypothèse, FISCAL_RULES.md §3).
 * - Méthode « taux de conversion » : capital × taux contractuel.
 */
export function annuityTerms(p: SimParams, converted: number, yearsToRetirement: number, retirementAge: number) {
  const fee = clamp(pct(p, 'arrearsFee'), 0, 1)
  if (p.annuityMethod === 'conversion') {
    return {
      grossYearly: converted * pct(p, 'conversionRate') * (1 - fee),
      guaranteedGrossYearly: null as number | null,
      estimated: false,
      annuityPrice: null as number | null,
      tableAge: null as number | null,
      outOfTable: false,
    }
  }
  const guaranteed = bool(p, 'tableGuaranteed')
  const shift = guaranteed ? 0 : (num(p, 'lifeGainPerDecade') / 10) * Math.max(0, yearsToRetirement)
  const tableAge = retirementAge - shift
  const { price, outOfTable } = tgf05Price(tableAge)
  const guaranteedPrice = tgf05Price(retirementAge).price
  return {
    grossYearly: (converted / price) * (1 - fee),
    guaranteedGrossYearly: guaranteed ? null : (converted / guaranteedPrice) * (1 - fee),
    estimated: true,
    annuityPrice: price,
    tableAge,
    outOfTable,
  }
}

// ---------- Paramètres ----------

const savings: ParamDef[] = savingsParams({ withDuration: false }).map((def) => {
  if (def.key === 'initialCapital') return { ...def, labelKey: 'params.initialDeposit', actions: [useCarryForward] }
  if (def.key === 'periodicAmount') return { ...def, actions: [maxDeductible] }
  return def
})

export const per: Product = {
  id: 'per',
  // Retraits interdits avant la retraite, sauf déblocages anticipés (résidence principale, accident de la vie).
  movementKinds: ['deposit', 'earlyRelease', 'earlyReleaseAccident'],
  params: [
    { key: 'currentAge', type: 'number', unit: 'age', min: 18, max: 80, step: 1, group: 'main' },
    { key: 'retirementAge', type: 'number', unit: 'age', min: 50, max: 80, step: 1, group: 'main' },
    ...savings,
    { key: 'deducted', type: 'boolean', group: 'main' },
    tmiParam('tmiNow', 'main'),
    { key: 'tmiRetirement', type: 'select', unit: 'pct', options: config.tmiOptions, group: 'main' },
    { key: 'exitMode', type: 'select', options: ['capital', 'annuity', 'mixed'], group: 'main' },
    { ...pctParam('capitalShare', 'main', 100, 5), visible: (p) => p.exitMode === 'mixed' },
    { key: 'annuityMethod', type: 'select', options: ['table', 'conversion'], group: 'main', visible: paysAnnuity },
    { key: 'tableGuaranteed', type: 'boolean', group: 'main', visible: tableMethod },
    { ...pctParam('conversionRate', 'main', 15, 0.1), visible: (p) => paysAnnuity(p) && !tableMethod(p) },
    { key: 'lifeExpectancy', type: 'number', unit: 'age', min: 60, max: 110, step: 0.5, group: 'main', visible: paysAnnuity },
    { key: 'endAge', type: 'number', unit: 'age', min: 0, max: 120, step: 1, group: 'main', visible: paysAnnuity },
    ...contractParams(),
    { key: 'income', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    { key: 'ceilingManual', type: 'boolean', group: 'advanced', visible: (p) => bool(p, 'deducted') },
    {
      key: 'ceilingOverride',
      type: 'number',
      unit: 'eur',
      min: 0,
      step: 100,
      group: 'advanced',
      visible: (p) => bool(p, 'deducted') && (bool(p, 'ceilingManual') || amount(p, 'ceilingOverride') > 0),
    },
    carryParam('carryN1', 1, [estimateCarry]),
    carryParam('carryN2', 2),
    carryParam('carryN3', 3),
    carryParam('carryN4', 4),
    carryParam('carryN5', 5),
    { key: 'spouseCeiling', type: 'number', unit: 'eur', min: 0, step: 100, group: 'advanced', visible: (p) => bool(p, 'deducted') },
    { key: 'reinvestSavings', type: 'boolean', group: 'advanced', visible: (p) => bool(p, 'deducted') },
    {
      key: 'lifeGainPerDecade',
      type: 'number',
      unit: 'yearsPerDecade',
      min: 0,
      max: 5,
      step: 0.1,
      group: 'advanced',
      visible: (p) => tableMethod(p) && !bool(p, 'tableGuaranteed'),
    },
    { ...pctParam('arrearsFee', 'advanced', 10, 0.1), visible: paysAnnuity },
    pctParam('socialRate', 'advanced', 30, 0.1),
  ],
  defaults: () => ({
    ...savingsDefaults(),
    currentAge: d.currentAge,
    retirementAge: d.retirementAge,
    deducted: true,
    tmiNow: d.tmiNow,
    tmiRetirement: d.tmiRetirement,
    exitMode: 'capital',
    capitalShare: d.capitalShare,
    annuityMethod: 'table',
    tableGuaranteed: false,
    lifeExpectancy: d.annuity.lifeExpectancy,
    lifeGainPerDecade: d.annuity.lifeGainPerDecade,
    arrearsFee: d.annuity.arrearsFee,
    conversionRate: d.annuity.conversionRate,
    endAge: 0,
    ...contractDefaults(d),
    income: 0,
    ceilingManual: false,
    ceilingOverride: 0,
    carryN1: 0,
    carryN2: 0,
    carryN3: 0,
    carryN4: 0,
    carryN5: 0,
    spouseCeiling: 0,
    reinvestSavings: false,
    socialRate: d.socialRate,
    taxContext: null,
  }),
  hasRisk: contractHasRisk,
  simulate: simulatePer,
}

// ---------- Simulation ----------

/** Âge (en années décimales) au début du mois i. */
const ageAtMonth = (currentAge: number, i: number) => currentAge + i / 12

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

  const ctx: TaxContext | null = taxContext(p)
  const deducted = bool(p, 'deducted')
  const tmiNow = (year: number) => tmiAt(p, 'tmiNow', year)
  const tmiRetirement = pct(p, 'tmiRetirement')
  const entryFee = pct(p, 'entryFee')
  const socialRate = pct(p, 'socialRate')
  const pfu = fiscal.pfuIncomeTax / 100
  const ceiling = perCeiling(p)
  const spouseCeiling = amount(p, 'spouseCeiling')

  const contract = new Contract(contractRates(p, scenario))
  const sched = buildSchedule(p, months)
  if (sched.outOfRange > 0) rec.warn('movementOutOfRange', { count: sched.outOfRange })
  if (deducted && !ctx) rec.warn('taxApproxEntry')
  if (deducted && ceiling === 0 && (bool(p, 'ceilingManual') || amount(p, 'ceilingOverride') > 0)) rec.warn('perZeroCeiling')

  /** Versements déduits / non déduits restant dans le contrat. */
  let deductedPremiums = 0
  let freePremiums = 0
  /** Versements de l'année éligibles à la déduction (titulaire de moins de 70 ans), et les autres. */
  let yearEligible = 0
  let ageLimitedDeposits = 0
  let savingsTotal = 0
  /** Économies d'impôt réinvesties dans le PER (versées le mois suivant) : elles ne s'ajoutent plus à la valeur nette. */
  const reinvest = bool(p, 'reinvestSavings')
  let pendingReinvest = 0
  let reinvested = 0
  /** Économies d'impôt conservées hors du PER (non réinvesties). */
  const savingsKept = () => savingsTotal - reinvested
  const yearsAboveCeiling: number[] = []

  let carries = initialCarries(p)
  let carryUsed = 0
  let spouseUsed = 0
  let carryLost = 0

  /** Impôt sur le revenu dû sur la part de capital issue de versements déduits (barème, système du quotient). */
  const deductedCapitalTax = (base: number, year: number, phase: 'now' | 'retirement') => {
    if (base <= 0) return 0
    const income = phase === 'now' ? ctx?.income : ctx?.retirementIncome
    if (ctx && income !== null && income !== undefined) return exceptionalIncomeTax(income, base, composition(ctx, year)).tax
    return base * (phase === 'now' ? tmiNow(year) : tmiRetirement)
  }

  /** Retrait d'une fraction `ratio` du contrat : répartition entre versements déduits, non déduits et gains. */
  const split = (value: number, ratio: number) => {
    const fromDeducted = deductedPremiums * ratio
    const fromFree = freePremiums * ratio
    return { fromDeducted, fromFree, gains: Math.max(0, value - fromDeducted - fromFree) }
  }

  const deposit = (i: number, year: number, v: number) => {
    if (v <= 0) return
    rec.fee(year, contract.deposit(v, entryFee))
    rec.deposit(i, year, v)
    freePremiums += v // reclassé en « déduit » en fin d'année, dans la limite du plafond disponible
    // Versements à partir de 70 ans : non déductibles depuis 2026 (LF 2026 art. 9).
    const age = ageAtMonth(currentAge, i)
    if (age >= f.deductionAgeLimit && year >= f.deductionAgeLimitFromYear) ageLimitedDeposits += v
    else yearEligible += v
  }

  // Le versement initial compte comme un versement de la première année.
  deposit(0, start.year, amount(p, 'initialCapital'))
  rec.startPoint(contract.value, contract.value)

  // ---------- Phase d'épargne, jusqu'à la retraite ----------
  for (const m of iterateMonths(start, months)) {
    deposit(m.i, m.year, sched.deposits[m.i])
    if (pendingReinvest > 0) {
      deposit(m.i, m.year, pendingReinvest)
      rec.reinvest(pendingReinvest)
      reinvested += pendingReinvest
      pendingReinvest = 0
    }

    for (const kind of ['home', 'accident'] as const) {
      const wanted = kind === 'home' ? sched.earlyReleases[m.i] : sched.accidentReleases[m.i]
      if (wanted <= 0) continue
      contract.creditEuro()
      const v = contract.value
      const taken = Math.min(wanted, v)
      if (taken < wanted) rec.warn('withdrawalCapped')
      const ratio = v > 0 ? taken / v : 0
      const s = split(taken, ratio)
      // Résidence principale : comme une sortie en capital. Accident de la vie : capital exonéré d'impôt sur le
      // revenu, gains soumis aux seuls prélèvements sociaux (FISCAL_RULES.md §3).
      const tax =
        kind === 'home'
          ? deductedCapitalTax(s.fromDeducted, m.year, 'now') + s.gains * (pfu + socialRate)
          : s.gains * socialRate
      contract.withdraw(taken)
      deductedPremiums -= s.fromDeducted
      freePremiums -= s.fromFree
      rec.tax(m.year, tax)
      rec.withdraw(m.i, m.year, taken, taken - tax)
    }

    const g = contract.grow()
    rec.gain(m.year, g.gain)
    rec.fee(m.year, g.fee)

    if (!m.isYearEnd) continue
    contract.creditEuro()
    rec.setTmi(m.year, Math.round(tmiNow(m.year) * 100))

    if (deducted) {
      // Imputation : plafond de l'année, puis reports du plus ancien au plus récent, puis plafond du conjoint.
      // La déduction porte sur les versements effectués, même si une partie a été débloquée depuis.
      const fromCurrent = Math.min(yearEligible, ceiling)
      let rest = yearEligible - fromCurrent
      let fromCarry = 0
      for (const cf of carries) {
        if (rest <= 0) break
        const take = Math.min(rest, cf.amount)
        cf.amount -= take
        rest -= take
        fromCarry += take
      }
      // Mutualisation : impossible à partir de l'année suivant les 70 ans du titulaire (âge du conjoint non connu).
      const ageEndOfYear = ageAtMonth(currentAge, m.i + 1)
      const fromSpouse = ageEndOfYear < f.deductionAgeLimit + 1 ? Math.min(rest, spouseCeiling) : 0
      rest -= fromSpouse
      carryUsed += fromCarry
      spouseUsed += fromSpouse
      if (rest > 0.005) yearsAboveCeiling.push(m.year)

      // La part non utilisée du plafond de l'année devient reportable ; les reports échus disparaissent.
      if (ceiling - fromCurrent > 0.005) carries.push({ origin: m.year, amount: ceiling - fromCurrent, entered: false })
      for (const cf of carries) {
        if (cf.entered && carryLastYear(cf.origin) <= m.year && cf.amount > 0.005) carryLost += cf.amount
      }
      carries = carries.filter((cf) => carryLastYear(cf.origin) > m.year && cf.amount > 0.005)

      const deductible = fromCurrent + fromCarry + fromSpouse
      if (deductible > 0) {
        const reclass = Math.min(deductible, freePremiums)
        deductedPremiums += reclass
        freePremiums -= reclass
        const saving = ctx ? deductionSaving(ctx.income, deductible, composition(ctx, m.year)) : deductible * tmiNow(m.year)
        savingsTotal += saving
        if (reinvest) pendingReinvest += saving
        rec.saving(m.i, m.year, saving)
      }
    }
    yearEligible = 0

    // Valeur nette si l'on sortait tout en capital à cette date (hypothèse de lecture, pas une sortie réelle).
    const v = contract.value
    const s = split(v, 1)
    const hypotheticalTax = deductedCapitalTax(s.fromDeducted, m.year, 'retirement') + s.gains * (pfu + socialRate)
    rec.close(m.i, m.year, v, v - hypotheticalTax + savingsKept())
  }

  if (yearsAboveCeiling.length > 0) rec.warn('perCeilingExceeded', { count: yearsAboveCeiling.length, first: yearsAboveCeiling[0] })
  if (carryLost > 0.5) rec.warn('perCarryExpired', { amount: Math.round(carryLost) })
  if (deducted && ageLimitedDeposits > 0) rec.warn('perAgeLimit', { amount: Math.round(ageLimitedDeposits) })
  const extraLines = [
    ...(carryUsed > 0.5 ? [{ key: 'carryUsed', amount: carryUsed }] : []),
    ...(spouseUsed > 0.5 ? [{ key: 'spouseUsed', amount: spouseUsed }] : []),
  ]

  // ---------- Sortie à la retraite ----------
  const lastI = months - 1
  const retirementYear = addMonths(start, lastI).year
  const exitAge = ageAtMonth(currentAge, months)
  const v = contract.value
  const mode = str(p, 'exitMode')
  const share = mode === 'capital' ? 1 : mode === 'annuity' ? 0 : clamp(pct(p, 'capitalShare'), 0, 1)
  const retirementCtxComplete = !!ctx && ctx.retirementIncome !== null
  if (!retirementCtxComplete && (deductedPremiums > 0 || mode !== 'capital')) rec.warn('taxApproxExit')

  /** Impôts d'une sortie en capital d'une fraction `ratio` du contrat. */
  const capitalExitTax = (ratio: number) => {
    const s = split(v * ratio, ratio)
    return deductedCapitalTax(s.fromDeducted, retirementYear, 'retirement') + s.gains * (pfu + socialRate)
  }

  const capitalGross = v * share
  const capitalTaxes = share > 0 ? capitalExitTax(share) : 0
  const converted = v - capitalGross

  // Fiscalité de la rente : part issue de versements déduits imposée comme une pension (abattement plafonné),
  // le reste comme une rente viagère à titre onéreux ; prélèvements sociaux sur la fraction imposable.
  const premiums = deductedPremiums + freePremiums
  const deductedShare = premiums > 0 ? deductedPremiums / premiums : 0
  const fraction = annuityTaxableFraction(exitAge)
  const annuityTax = (gross: number, year: number) => {
    const fromDeducted = gross * deductedShare
    const fromFree = gross - fromDeducted
    // Pensions du foyer inconnues : abattement de 10 % sans plancher (le retraité perçoit en général d'autres
    // pensions qui absorbent le plancher), limité au plafond du foyer (hypothèse, FISCAL_RULES.md §3).
    const pensionTaxable =
      ctx && ctx.retirementPensions !== null
        ? taxablePensionIncrement(fromDeducted, ctx.retirementPensions)
        : fromDeducted - Math.min(fromDeducted * (fiscal.pensionAllowance.rate / 100), fiscal.pensionAllowance.maxPerHousehold)
    let incomeTax: number
    if (ctx && ctx.retirementIncome !== null) {
      incomeTax = extraTax(ctx.retirementIncome, pensionTaxable + fromFree * fraction, composition(ctx, year))
    } else {
      incomeTax = (pensionTaxable + fromFree * fraction) * tmiRetirement
    }
    return incomeTax + gross * fraction * socialRate
  }

  // En sortie capital, la rente est calculée sur tout le capital, à titre de comparaison.
  const reference = mode === 'capital' ? v : converted
  const terms = annuityTerms(p, reference, months / 12, exitAge)
  if (terms.outOfTable && paysAnnuity(p)) rec.warn('annuityAgeOutOfTable')
  const netYearly = terms.grossYearly - annuityTax(terms.grossYearly, retirementYear)
  // Base de comparaison : ce que la même part aurait rapporté, net d'impôt, en sortie en capital.
  const capitalAlternativeNet = reference - (reference > 0 ? capitalExitTax(reference / Math.max(v, 1e-9)) : 0)
  const annuityBase = {
    grossYearly: terms.grossYearly,
    netYearly,
    estimated: terms.estimated,
    annuityPrice: terms.annuityPrice,
    tableAge: terms.tableAge,
    guaranteedNetYearly:
      terms.guaranteedGrossYearly === null ? null : terms.guaranteedGrossYearly - annuityTax(terms.guaranteedGrossYearly, retirementYear),
    capitalAlternativeNet,
    breakEvenAge: netYearly > 0 ? exitAge + capitalAlternativeNet / netYearly : null,
  }

  if (mode === 'capital') {
    return rec.finish({
      months,
      finalGross: v,
      finalNet: v - capitalTaxes + savingsKept(),
      exitTaxes: capitalTaxes,
      netFinalFlow: v - capitalTaxes,
      annuity: { ...annuityBase, indicative: true, endAge: null, totalNet: null },
      extraLines,
    })
  }

  // Part en capital versée à la retraite.
  if (capitalGross > 0) {
    rec.tax(retirementYear, capitalTaxes)
    rec.withdraw(lastI + 1, retirementYear, capitalGross, capitalGross - capitalTaxes)
  }

  // ---------- Phase de versement de la rente, jusqu'à l'âge de fin de simulation ----------
  const endAgeParam = num(p, 'endAge')
  const endAge = endAgeParam > 0 ? endAgeParam : num(p, 'lifeExpectancy')
  let payoutMonths = Math.round((endAge - exitAge) * 12)
  if (payoutMonths <= 0) {
    rec.warn('perEndAgeBeforeRetirement')
    payoutMonths = 0
  }
  payoutMonths = Math.min(payoutMonths, MAX_PAYOUT_MONTHS)

  const monthlyGross = terms.grossYearly / 12
  const yearTax = new Map<number, number>()
  let cumGross = capitalGross
  let cumNet = capitalGross - capitalTaxes
  let totalNet = 0

  for (let k = 0; k < payoutMonths; k++) {
    const i = months + k
    const ym = addMonths(start, i)
    if (!yearTax.has(ym.year)) yearTax.set(ym.year, annuityTax(terms.grossYearly, ym.year) / 12)
    const monthlyTax = yearTax.get(ym.year)!
    rec.annuity(i, ym.year, monthlyGross, monthlyTax)
    cumGross += monthlyGross
    cumNet += monthlyGross - monthlyTax
    totalNet += monthlyGross - monthlyTax
    if (ym.month === 12 || k === payoutMonths - 1) rec.close(i, ym.year, cumGross, cumNet + savingsKept())
  }

  return rec.finish({
    months: months + payoutMonths,
    finalGross: cumGross,
    finalNet: cumNet + savingsKept(),
    exitTaxes: 0,
    netFinalFlow: 0,
    grossFinalFlow: 0,
    annuity: { ...annuityBase, indicative: false, endAge: exitAge + payoutMonths / 12, totalNet },
    extraLines,
  })
}
