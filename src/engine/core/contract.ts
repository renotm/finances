import { config, type RiskProfile } from '../../config/defaults'
import type { Scenario, SimParams } from '../types'
import { clamp, pct, str } from './params'

export interface ContractRates {
  /** Part des versements investie sur le fonds euros (0 à 1). */
  euroShare: number
  euroRate: number
  euroFee: number
  ucRate: number
  ucFee: number
}

/** Lit les taux d'un contrat (assurance vie, PER) ; le scénario décale le rendement des UC. */
export function contractRates(p: SimParams, scenario: Scenario): ContractRates {
  const profile = config.riskProfiles[str(p, 'riskProfile') as RiskProfile] ?? config.riskProfiles.balanced
  const shift = scenario === 'low' ? -profile.spread : scenario === 'high' ? profile.spread : 0
  return {
    euroShare: clamp(pct(p, 'euroShare'), 0, 1),
    euroRate: pct(p, 'euroRate'),
    euroFee: pct(p, 'euroFee'),
    ucRate: pct(p, 'ucRate') + shift / 100,
    ucFee: pct(p, 'ucFee'),
  }
}

export function contractHasRisk(p: SimParams): boolean {
  return pct(p, 'euroShare') < 1
}

/**
 * Contrat multisupport : fonds euros + unités de compte.
 * - Fonds euros : intérêts (nets de frais de gestion) courus chaque mois, crédités au 31 décembre.
 * - UC : valorisation mensuelle au rendement moyen, frais de gestion prélevés sur l'encours.
 * - Les versements sont répartis selon euroShare ; pas d'arbitrage ni de rééquilibrage.
 */
export class Contract {
  euro = 0
  uc = 0
  /** Intérêts du fonds euros courus mais pas encore crédités. */
  accrued = 0
  /** Versements bruts restant dans le contrat (base de calcul des gains). */
  premiums = 0

  constructor(private r: ContractRates) {}

  get value(): number {
    return this.euro + this.uc
  }

  /** Verse un montant brut ; renvoie les frais sur versement prélevés. */
  deposit(amount: number, feeRate: number): number {
    const fee = amount * feeRate
    const net = amount - fee
    this.euro += net * this.r.euroShare
    this.uc += net * (1 - this.r.euroShare)
    this.premiums += amount
    return fee
  }

  /** Fait vivre le contrat un mois ; renvoie la performance brute et les frais de gestion du mois. */
  grow(): { gain: number; fee: number } {
    const euroGain = (this.euro * this.r.euroRate) / 12
    const euroFee = (this.euro * this.r.euroFee) / 12
    this.accrued += euroGain - euroFee

    const ucGain = this.uc * (Math.pow(1 + this.r.ucRate, 1 / 12) - 1)
    const ucFee = (this.uc + ucGain) * (1 - Math.pow(1 - this.r.ucFee, 1 / 12))
    this.uc += ucGain - ucFee

    return { gain: euroGain + ucGain, fee: euroFee + ucFee }
  }

  /** Crédite les intérêts courus du fonds euros ; renvoie le montant crédité. */
  creditEuro(): number {
    const v = this.accrued
    this.euro += v
    this.accrued = 0
    return v
  }

  /**
   * Retire un montant au prorata des supports.
   * Part de gains = montant − versements × (montant / valeur) ; elle peut être négative en cas de perte.
   */
  withdraw(wanted: number): { amount: number; gainsPart: number; ratio: number } {
    const v = this.value
    if (v <= 0 || wanted <= 0) return { amount: 0, gainsPart: 0, ratio: 0 }
    const amount = Math.min(wanted, v)
    const ratio = amount / v
    const premiumsPart = this.premiums * ratio
    this.euro *= 1 - ratio
    this.uc *= 1 - ratio
    this.premiums -= premiumsPart
    return { amount, gainsPart: amount - premiumsPart, ratio }
  }
}
