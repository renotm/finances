import { config, type RiskProfile } from '../../config/defaults'
import type { ParamDef, SimParams } from '../types'
import { pctParam } from './common'

const hasUc = (p: SimParams) => Number(p.euroShare) < 100

/** Paramètres d'un contrat multisupport (assurance vie, PER). */
export function contractParams(): ParamDef[] {
  return [
    pctParam('euroShare', 'main', 100, 5),
    pctParam('euroRate', 'main', 20, 0.05),
    {
      key: 'riskProfile',
      type: 'select',
      options: Object.keys(config.riskProfiles),
      group: 'main',
      visible: hasUc,
      onChange: (p) => {
        const profile = config.riskProfiles[p.riskProfile as RiskProfile]
        if (profile) p.ucRate = profile.rate
      },
    },
    { ...pctParam('ucRate', 'main', 30, 0.1), min: -20, visible: hasUc },
    pctParam('entryFee', 'advanced', 10, 0.1),
    pctParam('euroFee', 'advanced', 5, 0.05),
    { ...pctParam('ucFee', 'advanced', 5, 0.05), visible: hasUc },
  ]
}

export function contractDefaults(c: { entryFee: number; euroShare: number; euroRate: number; euroFee: number; ucFee: number }) {
  return {
    entryFee: c.entryFee,
    euroShare: c.euroShare,
    euroRate: c.euroRate,
    euroFee: c.euroFee,
    riskProfile: 'balanced',
    ucRate: config.riskProfiles.balanced.rate,
    ucFee: c.ucFee,
  }
}
