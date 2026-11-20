/** Mois de l'année au format 'YYYY-MM'. */
export type YearMonth = string

export type MovementKind = 'deposit' | 'withdrawal' | 'earlyRelease'

/** Versement ou retrait ponctuel, effectué le 1er du mois indiqué. */
export interface Movement {
  id: number
  date: YearMonth
  amount: number
  kind: MovementKind
}

export type ParamValue = number | string | boolean

/** Paramètres d'un placement : valeurs simples indexées par clé, plus la liste des mouvements ponctuels. */
export type SimParams = { [key: string]: ParamValue | Movement[] } & { movements: Movement[] }

export type ParamUnit = 'eur' | 'pct' | 'years' | 'months' | 'age'

export interface ParamDef {
  key: string
  type: 'number' | 'select' | 'boolean' | 'yearMonth'
  unit?: ParamUnit
  min?: number
  max?: number
  step?: number
  /** Valeurs possibles d'un select. Une valeur numérique est affichée comme un nombre (avec son unité). */
  options?: readonly (string | number)[]
  group: 'main' | 'advanced'
  visible?: (p: SimParams) => boolean
  /** Ajuste d'autres paramètres quand celui-ci change (ex. : profil de risque → rendement par défaut). */
  onChange?: (p: SimParams) => void
}

/** 'mid' : taux moyen. 'low' / 'high' : bornes de la fourchette des supports risqués. */
export type Scenario = 'mid' | 'low' | 'high'

export interface YearRow {
  year: number
  deposits: number
  withdrawals: number
  /** Performance brute (intérêts, plus-values) avant frais. */
  gains: number
  fees: number
  /** Impôts et prélèvements sociaux effectivement payés dans l'année. */
  taxes: number
  taxSavings: number
  endValue: number
  /** Valeur nette en cas de retrait total à la fin de l'année. */
  netValue: number
}

export interface Point {
  /** Position sur l'axe du temps, en années décimales. */
  t: number
  /** Mois auquel correspond le point (fin de mois, ou mois de début pour le premier point). */
  date: YearMonth
  isStart: boolean
  gross: number
  net: number
}

export interface Warning {
  code: string
  params?: Record<string, string | number>
}

export interface Annuity {
  grossYearly: number
  netYearly: number
  /** Nombre d'années de rente nette pour récupérer le capital converti. */
  breakEvenYears: number | null
}

export interface Summary {
  totalDeposited: number
  totalWithdrawn: number
  finalGross: number
  finalNet: number
  gains: number
  fees: number
  /** Impôts payés pendant la simulation + impôts dus à la sortie. */
  taxes: number
  taxSavings: number
  /** Taux de rendement annuel (TRI), null si non calculable. */
  annualReturnGross: number | null
  annualReturnNet: number | null
}

export interface SimResult {
  points: Point[]
  years: YearRow[]
  summary: Summary
  warnings: Warning[]
  annuity?: Annuity
}

export interface Product {
  id: string
  params: ParamDef[]
  movementKinds: MovementKind[]
  defaults(): SimParams
  /** Vrai si le placement contient des supports risqués (affichage d'une fourchette). */
  hasRisk(p: SimParams): boolean
  simulate(p: SimParams, scenario: Scenario): SimResult
}
