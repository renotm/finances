/**
 * Livret bancaire fiscalisé, type Bourso+ (SPEC §4.2, FISCAL_RULES.md §5).
 *
 * À l'inscription des intérêts (31 décembre), la banque retient les prélèvements sociaux et l'acompte de 12,8 %
 * (sauf dispense) : seuls les intérêts nets sont capitalisés. L'impôt définitif est régularisé hors du livret :
 * nul au PFU (l'acompte vaut l'impôt), différence entre l'impôt au barème et l'acompte en cas d'option, avec la
 * CSG déductible (6,8 %).
 */
import { config } from '../../config/defaults'
import { fiscal } from '../../config/fiscal'
import { simulateLivret, type InterestTax } from '../core/livret'
import { amount, bool, num, pct, str } from '../core/params'
import { tmiAt, tmiParam } from '../core/tmi'
import { composition, taxContext } from '../tax/context'
import { deductionSaving, extraTax } from '../tax/incomeTax'
import type { Product, SimParams } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'

const c = config.livretBancaire
const cents = (x: number) => Math.round(x * 100) / 100

export const livretBancaire: Product = {
  id: 'livretBancaire',
  movementKinds: ['deposit', 'withdrawal'],
  params: [
    ...savingsParams({ withDuration: true }),
    pctParam('baseRate', 'main', 20, 0.05),
    pctParam('boostRate', 'advanced', 20, 0.05),
    { key: 'boostMonths', type: 'number', unit: 'months', min: 0, max: 720, step: 1, group: 'advanced' },
    { key: 'boostCap', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced' },
    { key: 'cap', type: 'number', unit: 'eur', min: 0, step: 1000, group: 'advanced' },
    { key: 'taxMode', type: 'select', options: ['flat', 'bareme'], group: 'advanced' },
    tmiParam('tmi', 'advanced', (p) => p.taxMode === 'bareme'),
    { key: 'pfnlExemption', type: 'boolean', group: 'advanced' },
    pctParam('socialRate', 'advanced', 30, 0.1),
  ],
  defaults: () => ({
    ...savingsDefaults(),
    baseRate: c.baseRate,
    boostRate: c.boostRate,
    boostMonths: c.boostMonths,
    boostCap: c.boostCap,
    cap: c.cap,
    taxMode: 'flat',
    tmi: c.tmi,
    pfnlExemption: false,
    socialRate: c.socialRate,
    taxContext: null,
  }),
  hasRisk: () => false,
  simulate(p) {
    const base = pct(p, 'baseRate')
    const boost = pct(p, 'boostRate')
    const boostMonths = Math.max(0, Math.round(num(p, 'boostMonths')))
    const boostCap = amount(p, 'boostCap')

    const interest = (balance: number, i: number) => {
      const boosted = boost > 0 && (boostMonths === 0 || i < boostMonths)
      if (!boosted) return (balance * base) / 24
      const atBoost = boostCap > 0 ? Math.min(balance, boostCap) : balance
      return (atBoost * boost + (balance - atBoost) * base) / 24
    }

    const result = simulateLivret(p, { cap: amount(p, 'cap'), interest, tax: (year, i) => interestTax(p, year, i) })
    if (str(p, 'taxMode') === 'bareme' && !taxContext(p)) result.warnings.push({ code: 'taxApproxBareme' })
    return result
  },
}

/**
 * Fiscalité des intérêts d'une année : retenues à la source (prélèvements sociaux, acompte de 12,8 %) et
 * régularisation de l'impôt définitif (PFU ou barème avec CSG déductible).
 */
export function interestTax(p: SimParams, year: number, interest: number): InterestTax {
  const gross = Math.max(0, interest)
  const social = cents(gross * pct(p, 'socialRate'))
  const pfuRate = fiscal.pfuIncomeTax / 100
  const advance = bool(p, 'pfnlExemption') ? 0 : cents(gross * pfuRate)
  const withheld = social + advance

  if (str(p, 'taxMode') !== 'bareme') {
    // PFU : l'impôt définitif est de 12,8 %, l'acompte le solde (sauf dispense : payé l'année suivante).
    return { withheld, outOfPocket: cents(gross * pfuRate) - advance, tmi: null }
  }

  // Option pour le barème : impôt au barème moins la CSG déductible l'année suivante, moins l'acompte.
  const csg = gross * (fiscal.social.deductibleCsg / 100)
  const ctx = taxContext(p)
  let finalTax: number
  if (ctx) {
    const comp = composition(ctx, year)
    finalTax = extraTax(ctx.income, gross, comp) - deductionSaving(ctx.income + gross, csg, comp)
  } else {
    const tmi = tmiAt(p, 'tmi', year)
    finalTax = gross * tmi - csg * tmi
  }
  return { withheld, outOfPocket: cents(finalTax) - advance, tmi: Math.round(tmiAt(p, 'tmi', year) * 100) }
}
