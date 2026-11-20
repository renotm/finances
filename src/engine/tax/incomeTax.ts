/**
 * Moteur de l'impôt sur le revenu (SPEC §4.7, FISCAL_RULES.md §1).
 * Fonctions pures, sans dépendance aux placements : barème, quotient familial et son plafonnement, décote,
 * abattement sur les pensions, système du quotient, impôt supplémentaire d'un revenu, économie d'une déduction.
 */
import { fiscal } from '../../config/fiscal'
import { parseYM } from '../core/dates'
import type { TmiStep, YearMonth } from '../types'

export type { TmiStep }

const it = fiscal.incomeTax

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
  /** Personne seule vivant seule (condition de la demi-part de parent isolé). Défaut : vrai. */
  livesAlone?: boolean
}

/** Composition du foyer une année donnée. */
export interface Composition {
  situation: FamilySituation
  children: number
  livesAlone: boolean
}

// ---------- Enfants et parts ----------

/**
 * Enfant à charge pour les revenus de l'année `year` : né au plus tard dans l'année,
 * moins de 18 ans au 1er janvier (21 ou 25 s'il est rattaché), sans limite s'il est invalide.
 * Avec un mois de naissance seulement, l'anniversaire est supposé après le 1er janvier.
 */
export function isChildInCharge(child: Child, year: number): boolean {
  const birthYear = parseYM(child.birth).year
  if (birthYear > year) return false
  if (child.disabled) return true
  const ageOnJan1 = year - birthYear - 1
  const limit = child.attachment === 'none' ? fiscal.children.minorAgeLimit : fiscal.children.attachedAgeLimit[child.attachment]
  return ageOnJan1 < limit
}

export function childrenInCharge(children: Child[], year: number): number {
  return children.filter((c) => isChildInCharge(c, year)).length
}

/** Parts de base : 2 pour un couple marié ou pacsé, et pour une personne veuve avec enfant(s) à charge ; 1 sinon. */
export function baseParts(situation: FamilySituation, children: number): number {
  if (situation === 'married') return 2
  if (situation === 'widowed' && children > 0) return 2
  return 1
}

/** Demi-part de parent isolé (case T) : célibataire ou divorcé, vivant seul, avec au moins un enfant à charge. */
export function isSingleParent(situation: FamilySituation, children: number, livesAlone = true): boolean {
  return (situation === 'single' || situation === 'divorced') && children > 0 && livesAlone
}

/** Nombre de parts : parts de base + enfants (0,5 pour les deux premiers, 1 ensuite) + parent isolé. */
export function familyParts(situation: FamilySituation, children: number, livesAlone = true): number {
  const childParts = children <= 2 ? children * 0.5 : 1 + (children - 2)
  return baseParts(situation, children) + childParts + (isSingleParent(situation, children, livesAlone) ? 0.5 : 0)
}

// ---------- Impôt ----------

/** Impôt d'une part au barème progressif. */
function taxPerPart(quotient: number): number {
  let tax = 0
  let floor = 0
  for (const b of it.brackets) {
    if (quotient > floor) tax += (Math.min(quotient, b.upTo) - floor) * (b.rate / 100)
    floor = b.upTo
  }
  return tax
}

function bracketRate(quotient: number): number {
  return (it.brackets.find((b) => quotient <= b.upTo) ?? it.brackets[it.brackets.length - 1]).rate
}

/** Plafond de l'avantage procuré par les parts au-delà des parts de base. */
function qfCap(situation: FamilySituation, children: number, parts: number, livesAlone: boolean): number {
  const extraHalfParts = Math.round((parts - baseParts(situation, children)) * 2)
  if (isSingleParent(situation, children, livesAlone)) {
    return it.qfCapSingleParent + Math.max(0, extraHalfParts - 2) * it.qfCapPerHalfPart
  }
  return extraHalfParts * it.qfCapPerHalfPart
}

export interface TaxResult {
  /** Impôt dû après plafonnement du quotient familial et décote. */
  tax: number
  /** Impôt après plafonnement, avant décote. */
  grossTax: number
  decote: number
  parts: number
  /** Quotient retenu pour la tranche (revenu ÷ parts, ou ÷ parts de base si le plafonnement s'applique). */
  quotient: number
  capped: boolean
  /** Tranche du barème (TMI au sens de la tranche, en %). */
  bracketRate: number
}

/** Impôt sur le revenu d'un foyer (CGI art. 197) : barème, plafonnement du quotient familial, décote. */
export function incomeTax(income: number, c: Composition): TaxResult {
  const parts = familyParts(c.situation, c.children, c.livesAlone)
  const base = baseParts(c.situation, c.children)
  const revenue = Math.max(0, income)
  const full = parts * taxPerPart(revenue / parts)
  const withBase = base * taxPerPart(revenue / base)
  const cap = qfCap(c.situation, c.children, parts, c.livesAlone)
  const capped = withBase - full > cap + 1e-9
  const grossTax = capped ? withBase - cap : full
  const forfait = c.situation === 'married' ? it.decote.couple : it.decote.single
  const decote = Math.min(grossTax, Math.max(0, forfait - (it.decote.rate / 100) * grossTax))
  const quotient = revenue / (capped ? base : parts)
  return { tax: grossTax - decote, grossTax, decote, parts, quotient, capped, bracketRate: bracketRate(quotient) }
}

/** Impôt supplémentaire dû à un revenu ajouté au revenu imposable. */
export function extraTax(income: number, extra: number, c: Composition): number {
  return incomeTax(income + Math.max(0, extra), c).tax - incomeTax(income, c).tax
}

/** Économie d'impôt procurée par une déduction du revenu imposable (ex. : versement sur un PER). */
export function deductionSaving(income: number, deduction: number, c: Composition): number {
  return incomeTax(income, c).tax - incomeTax(Math.max(0, income - Math.max(0, deduction)), c).tax
}

/**
 * Impôt d'un revenu exceptionnel avec le système du quotient (CGI art. 163-0 A) :
 * coef × [impôt(revenu + exceptionnel ÷ coef) − impôt(revenu)]. Le contribuable n'opte que si c'est favorable :
 * la fonction renvoie le minimum entre l'imposition directe et le système du quotient.
 */
export function exceptionalIncomeTax(income: number, exceptional: number, c: Composition, coef = fiscal.quotientSystemCoefficient) {
  const direct = extraTax(income, exceptional, c)
  const withQuotient = coef * extraTax(income, exceptional / coef, c)
  return { tax: Math.min(direct, withQuotient), direct, withQuotient, quotientUsed: withQuotient < direct }
}

/**
 * Abattement de 10 % sur les pensions du foyer (CGI art. 158-5 a) :
 * 10 % des pensions, au moins le plancher par pensionné (sans dépasser la pension), au plus le plafond du foyer.
 */
export function pensionAllowance(grossPensions: number, pensioners = 1): number {
  const p = Math.max(0, grossPensions)
  if (p === 0) return 0
  const pa = fiscal.pensionAllowance
  const tenPercent = (p * pa.rate) / 100
  const withFloor = Math.min(p, Math.max(tenPercent, pa.minPerPensioner * Math.max(1, pensioners)))
  return Math.min(withFloor, pa.maxPerHousehold)
}

/**
 * Abattement de 10 % d'un foyer qui compte plusieurs pensionnés (CGI art. 158-5 a) : calculé pour chacun
 * (10 % de sa pension, au moins le plancher sans dépasser sa pension), puis limité au plafond du foyer.
 */
export function householdPensionAllowance(pensionsByPerson: number[]): number {
  const pa = fiscal.pensionAllowance
  const sum = pensionsByPerson
    .filter((p) => p > 0)
    .reduce((acc, p) => acc + Math.min(p, Math.max((p * pa.rate) / 100, pa.minPerPensioner)), 0)
  return Math.min(sum, pa.maxPerHousehold)
}

/**
 * Part imposable d'une pension supplémentaire perçue par une personne du foyer, compte tenu de ses propres
 * pensions et de celles des autres pensionnés du foyer (plancher par pensionné, plafond par foyer).
 */
export function taxablePensionIncrement(additionalPension: number, ownPensions: number, otherPensions: number[] = []): number {
  const before = ownPensions + sumOf(otherPensions) - householdPensionAllowance([ownPensions, ...otherPensions])
  const after = ownPensions + additionalPension + sumOf(otherPensions) - householdPensionAllowance([ownPensions + additionalPension, ...otherPensions])
  return Math.max(0, after - before)
}

const sumOf = (xs: number[]) => xs.reduce((acc, x) => acc + Math.max(0, x), 0)

// ---------- TMI (tranche) et calendrier ----------

export interface TmiResult {
  tmi: number
  parts: number
  quotient: number
  capped: boolean
}

/** TMI d'un foyer : tranche du barème où tombe le quotient, plafonnement du quotient familial compris. */
export function computeTmi(situation: FamilySituation, children: number, income: number, livesAlone = true): TmiResult {
  const r = incomeTax(income, { situation, children, livesAlone })
  return { tmi: r.bracketRate, parts: r.parts, quotient: r.quotient, capped: r.capped }
}

/** Composition du foyer pour les revenus de l'année `year`. */
export function compositionAt(h: Pick<Household, 'situation' | 'children' | 'livesAlone'>, year: number): Composition {
  return { situation: h.situation, children: childrenInCharge(h.children, year), livesAlone: h.livesAlone ?? true }
}

/**
 * Calendrier de TMI de `fromYear` à `toYear` inclus : une entrée à chaque changement de TMI ou de parts.
 * Revenu supposé constant.
 */
export function tmiSchedule(h: Household, fromYear: number, toYear: number): TmiStep[] {
  const steps: TmiStep[] = []
  for (let year = fromYear; year <= toYear; year++) {
    const c = compositionAt(h, year)
    const r = computeTmi(c.situation, c.children, h.income, c.livesAlone)
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
