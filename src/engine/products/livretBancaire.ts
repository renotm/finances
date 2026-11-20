import { config } from '../../config/defaults'
import { simulateLivret } from '../core/livret'
import { amount, num, pct, str } from '../core/params'
import type { Product } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'

const c = config.livretBancaire

/** Livret bancaire fiscalisé (type Bourso+) : taux de base, boost éventuel, flat tax ou barème. */
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
    {
      key: 'tmi',
      type: 'select',
      unit: 'pct',
      options: config.tmiOptions,
      group: 'advanced',
      visible: (p) => p.taxMode === 'bareme',
    },
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
    socialRate: c.socialRate,
  }),
  hasRisk: () => false,
  simulate(p) {
    const base = pct(p, 'baseRate')
    const boost = pct(p, 'boostRate')
    const boostMonths = Math.max(0, Math.round(num(p, 'boostMonths')))
    const boostCap = amount(p, 'boostCap')
    const incomeTax = str(p, 'taxMode') === 'bareme' ? pct(p, 'tmi') : config.pfuIncomeTax / 100

    const interest = (balance: number, i: number) => {
      const boosted = boost > 0 && (boostMonths === 0 || i < boostMonths)
      if (!boosted) return (balance * base) / 24
      const atBoost = boostCap > 0 ? Math.min(balance, boostCap) : balance
      return (atBoost * boost + (balance - atBoost) * base) / 24
    }

    return simulateLivret(p, {
      cap: amount(p, 'cap'),
      interest,
      taxRate: incomeTax + pct(p, 'socialRate'),
    })
  },
}
