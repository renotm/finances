import { config } from '../../config/defaults'
import { tmiForYear } from '../tax/incomeTax'
import type { ParamDef, SimParams, TmiStep } from '../types'
import { num } from './params'

/** Valeur d'un paramètre de TMI qui suit le calendrier calculé à partir du profil (SPEC §4.7). */
export const PROFILE_TMI = 'profile'

/** Calendrier de TMI de la colonne, rempli à partir du profil (vide sinon). */
export function tmiSteps(p: SimParams): TmiStep[] {
  return Array.isArray(p.tmiSchedule) ? (p.tmiSchedule as TmiStep[]) : []
}

/** Vrai si le paramètre `key` suit le calendrier du profil. */
export function followsProfile(p: SimParams, key: string): boolean {
  return p[key] === PROFILE_TMI && tmiSteps(p).length > 0
}

/** TMI (en décimal) applicable l'année `year` pour le paramètre `key` : calendrier du profil ou taux fixe. */
export function tmiAt(p: SimParams, key: string, year: number): number {
  if (followsProfile(p, key)) return (tmiForYear(tmiSteps(p), year) ?? 0) / 100
  return num(p, key) / 100
}

/** Paramètre « TMI » : liste des taux, plus « Selon le profil » quand un calendrier est disponible. */
export function tmiParam(key: string, group: 'main' | 'advanced', visible?: (p: SimParams) => boolean): ParamDef {
  return {
    key,
    type: 'select',
    unit: 'pct',
    options: config.tmiOptions,
    optionsFor: (p) => (tmiSteps(p).length > 0 ? [PROFILE_TMI, ...config.tmiOptions] : config.tmiOptions),
    tmiNote: (p) => (followsProfile(p, key) ? tmiSteps(p) : null),
    group,
    visible,
  }
}
