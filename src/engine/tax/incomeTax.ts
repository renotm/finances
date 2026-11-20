import { config } from '../../config/defaults'
import { parseYM } from '../core/dates'
import type { TmiStep, YearMonth } from '../types'

export type { TmiStep }

const t = config.incomeTax

export type FamilySituation = 'single' | 'married' | 'divorced' | 'widowed'
export type ChildAttachment = 'none' | '21' | '25'

export interface Child {
  id: number
  birth: YearMonth
  attachment: ChildAttachment
  disabled: boolean
}

export interface Household {
  situation: FamilySituation
  children: Child[]
  /** Revenu net imposable du foyer. */
  income: number
}

/**
 * Enfant à charge pour les revenus de l'année `year` (SPEC §4.7) : né au plus tard dans l'année,
 * moins de 18 ans au 1er janvier (21 ou 25 s'il est rattaché), sans limite s'il est invalide.
 * Avec un mois de naissance seulement, l'anniversaire est supposé après le 1er janvier.
 */
export function isChildInCharge(child: Child, year: number): boolean {
  const birthYear = parseYM(child.birth).year
  if (birthYear > year) return false
  if (child.disabled) return true
  const ageOnJan1 = year - birthYear - 1
  const limit = child.attachment === 'none' ? t.childAgeLimit : t.attachedAgeLimit[child.attachment]
  return ageOnJan1 < limit
}

export function childrenInCharge(children: Child[], year: number): number {
  return children.filter((c) => isChildInCharge(c, year)).length
}

/** Parts de base : 2 pour un couple, et pour une personne veuve avec enfant(s) à charge ; 1 sinon. */
export function baseParts(situation: FamilySituation, children: number): number {
  if (situation === 'married') return 2
  if (situation === 'widowed' && children > 0) return 2
  return 1
}

/** Nombre de parts : parts de base + enfants (0,5 pour les deux premiers, 1 ensuite) + parent isolé. */
export function familyParts(situation: FamilySituation, children: number): number {
  const childParts = children <= 2 ? children * 0.5 : 1 + (children - 2)
  const singleParent = (situation === 'single' || situation === 'divorced') && children > 0 ? 0.5 : 0
  return baseParts(situation, children) + childParts + singleParent
}

/** Impôt d'une part, au barème progressif. */
function taxPerPart(quotient: number): number {
  let tax = 0
  let floor = 0
  for (const b of t.brackets) {
    if (quotient > floor) tax += (Math.min(quotient, b.upTo) - floor) * (b.rate / 100)
    floor = b.upTo
  }
  return tax
}

function bracketRate(quotient: number): number {
  return (t.brackets.find((b) => quotient <= b.upTo) ?? t.brackets[t.brackets.length - 1]).rate
}

/** Plafond de l'avantage procuré par les parts au-delà des parts de base. */
function qfCap(situation: FamilySituation, children: number, parts: number): number {
  const extraHalfParts = Math.round((parts - baseParts(situation, children)) * 2)
  const singleParent = (situation === 'single' || situation === 'divorced') && children > 0
  if (singleParent) return t.qfCapSingleParent + Math.max(0, extraHalfParts - 2) * t.qfCapPerHalfPart
  return extraHalfParts * t.qfCapPerHalfPart
}

export interface TmiResult {
  tmi: number
  parts: number
  quotient: number
  capped: boolean
}

/** TMI d'un foyer pour un nombre d'enfants à charge donné, plafonnement du quotient familial compris. */
export function computeTmi(situation: FamilySituation, children: number, income: number): TmiResult {
  const parts = familyParts(situation, children)
  const base = baseParts(situation, children)
  const revenue = Math.max(0, income)
  const full = parts * taxPerPart(revenue / parts)
  const withBase = base * taxPerPart(revenue / base)
  const capped = withBase - full > qfCap(situation, children, parts) + 1e-9
  const quotient = revenue / (capped ? base : parts)
  return { tmi: bracketRate(quotient), parts, quotient, capped }
}

/**
 * Calendrier de TMI de `fromYear` à `toYear` inclus : une entrée à chaque changement de TMI ou de parts.
 * Revenu supposé constant.
 */
export function tmiSchedule(h: Household, fromYear: number, toYear: number): TmiStep[] {
  const steps: TmiStep[] = []
  for (let year = fromYear; year <= toYear; year++) {
    const r = computeTmi(h.situation, childrenInCharge(h.children, year), h.income)
    const last = steps[steps.length - 1]
    if (!last || last.tmi !== r.tmi || last.parts !== r.parts) steps.push({ fromYear: year, tmi: r.tmi, parts: r.parts })
  }
  return steps
}

/** TMI d'une année dans un calendrier (dernier changement dont l'année est passée). */
export function tmiForYear(steps: TmiStep[], year: number): number | null {
  let tmi: number | null = null
  for (const s of steps) {
    if (s.fromYear <= year) tmi = s.tmi
    else break
  }
  return tmi ?? (steps.length ? steps[0].tmi : null)
}
