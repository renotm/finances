import { config } from '../../config/defaults'
import { simulateLivret } from '../core/livret'
import { amount, pct } from '../core/params'
import type { Product } from '../types'
import { pctParam, savingsDefaults, savingsParams } from './common'

/** Livret réglementé exonéré (Livret A, LDDS) : taux unique, plafond, pas d'impôt. */
function livretReglemente(id: string, defaults: { rate: number; cap: number }): Product {
  return {
    id,
    movementKinds: ['deposit', 'withdrawal'],
    params: [
      ...savingsParams({ withDuration: true }),
      pctParam('rate', 'main', 20, 0.05),
      { key: 'cap', type: 'number', unit: 'eur', min: 0, step: 50, group: 'advanced' },
    ],
    defaults: () => ({ ...savingsDefaults(), rate: defaults.rate, cap: defaults.cap }),
    hasRisk: () => false,
    simulate(p) {
      const rate = pct(p, 'rate')
      return simulateLivret(p, {
        cap: amount(p, 'cap'),
        interest: (balance) => (balance * rate) / 24,
      })
    },
  }
}

export const livretA = livretReglemente('livretA', config.livretA)
export const ldds = livretReglemente('ldds', config.ldds)
