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

export type ParamUnit = 'eur' | 'pct' | 'years' | 'months' | 'age' | 'yearsPerDecade'

/** Modification de paramètres produite par une action (plusieurs clés possibles, mouvements compris). */
export type ParamPatch = { [key: string]: ParamValue | Movement[] }

/** Petit bouton placé sur la ligne d'un libellé, qui remplit un ou plusieurs paramètres (ex. : « Max »). */
export interface ParamAction {
  id: string
  visible: (p: SimParams) => boolean
  apply: (p: SimParams) => ParamPatch
  /** Ligne d'aide (clé sous `actions.<id>`) : montants en euros à formater, et autres valeurs telles quelles. */
  hint?: (p: SimParams) => { key: string; amounts: Record<string, number>; values?: Record<string, string | number> }
}

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
  actions?: ParamAction[]
  /** Clé de traduction du libellé, si elle diffère de `params.<key>` (ex. : « Versement initial » pour le PER). */
  labelKey?: string
  /** Valeurs insérées dans le libellé traduit (ex. : l'année d'un plafond). */
  labelParams?: (p: SimParams) => Record<string, string | number>
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
  /** Rentes versées dans l'année (PER), brutes et nettes d'impôts. */
  annuityGross: number
  annuityNet: number
  /** Valeur du placement au 31/12 ; pendant le versement d'une rente, cumul brut perçu. */
  endValue: number
  /** Valeur nette en cas de retrait total à la fin de l'année ; pendant le versement d'une rente, cumul net perçu. */
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
  /** Vrai en sortie capital : rente donnée à titre de comparaison, non versée. */
  indicative: boolean
  /** Rente annuelle après frais sur arrérages, avant impôts. */
  grossYearly: number
  netYearly: number
  /** Durée de rente retenue pour le calcul (années après le départ) et âge correspondant. */
  calcYears: number
  calcAge: number
  /** Rente nette annuelle avec une table garantie à la souscription (si la table ne l'est pas). */
  guaranteedNetYearly: number | null
  /** Âge de fin de simulation et total des rentes nettes perçues jusque-là (null si indicative). */
  endAge: number | null
  totalNet: number | null
  /** Âge à partir duquel les rentes nettes cumulées dépassent le capital converti. */
  breakEvenAge: number | null
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

/** Ligne de synthèse propre à un placement (clé de traduction sous `summary.extra`). */
export interface ExtraLine {
  key: string
  amount: number
}

export interface SimResult {
  points: Point[]
  years: YearRow[]
  summary: Summary
  warnings: Warning[]
  annuity?: Annuity
  extraLines?: ExtraLine[]
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
