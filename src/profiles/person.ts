import { config } from '../config/defaults'
import { addMonths, currentYM, formatYM, parseYM } from '../engine/core/dates'
import { computeTmi, childrenInCharge, tmiSchedule, type Child, type FamilySituation, type TmiStep } from '../engine/tax/incomeTax'
import type { YearMonth } from '../engine/types'

export type Sex = 'male' | 'female' | 'unspecified'

/**
 * Une personne enregistrée (SPEC §5.5). Un champ à null n'est pas renseigné :
 * il ne remplace pas la valeur par défaut de la config.
 */
export interface Person {
  id: number
  name: string
  birth: YearMonth
  sex: Sex
  retirementAge: number | null
  situation: FamilySituation
  children: Child[]
  /** Revenu net imposable du foyer. */
  taxableIncome: number | null
  /** TMI saisie à la main (fixe) au lieu du calcul. */
  tmiManual: boolean
  tmiValue: number
  tmiRetirement: number | null
  /** Revenus professionnels nets de la personne (plafond de déduction du PER). */
  professionalIncome: number | null
  /** Plafond épargne retraite de l'avis d'impôt : plafond de l'année et plafonds non utilisés N−1 à N−3. */
  ceilingYear: number | null
  carryN1: number | null
  carryN2: number | null
  carryN3: number | null
}

export function newPerson(id: number, name: string): Person {
  return {
    id,
    name,
    birth: formatYM(addMonths(parseYM(currentYM()), -config.per.currentAge * 12)),
    sex: 'unspecified',
    retirementAge: config.per.retirementAge,
    situation: 'single',
    children: [],
    taxableIncome: null,
    tmiManual: false,
    tmiValue: config.per.tmiNow,
    tmiRetirement: config.per.tmiRetirement,
    professionalIncome: null,
    ceilingYear: null,
    carryN1: null,
    carryN2: null,
    carryN3: null,
  }
}

/** Âge à une date, en années décimales (mois compris). */
export function ageAt(birth: YearMonth, at: YearMonth): number {
  const b = parseYM(birth)
  const d = parseYM(at)
  return Math.max(0, (d.year - b.year) * 12 + (d.month - b.month)) / 12
}

/** Nombre d'années couvertes par le calendrier de TMI (au-delà de toute simulation réaliste). */
const SCHEDULE_YEARS = 60

/** Calendrier de TMI de la personne à partir de `fromYear`, ou null si la TMI est saisie ou le revenu absent. */
export function personTmiSchedule(person: Person, fromYear: number): TmiStep[] | null {
  if (person.tmiManual || person.taxableIncome === null) return null
  return tmiSchedule(
    { situation: person.situation, children: person.children, income: person.taxableIncome },
    fromYear,
    fromYear + SCHEDULE_YEARS,
  )
}

/** Détail de la TMI d'une année (pour l'affichage dans la page des profils). */
export function personTmiDetail(person: Person, year: number) {
  if (person.taxableIncome === null) return null
  return computeTmi(person.situation, childrenInCharge(person.children, year), person.taxableIncome)
}
