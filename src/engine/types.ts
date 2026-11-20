/** Mois de l'année au format 'YYYY-MM'. */
export type YearMonth = string

/** earlyRelease : déblocage anticipé du PER pour la résidence principale ; earlyReleaseAccident : pour un accident de la vie. */
export type MovementKind = 'deposit' | 'withdrawal' | 'earlyRelease' | 'earlyReleaseAccident'

/** Versement ou retrait ponctuel, effectué le 1er du mois indiqué. */
export interface Movement {
  id: number
  date: YearMonth
  amount: number
  kind: MovementKind
}

export type ParamValue = number | string | boolean

/** Un changement du calendrier de TMI (SPEC §4.7) : à partir de `fromYear`, TMI de `tmi` %. */
export interface TmiStep {
  fromYear: number
  tmi: number
  parts: number
}

/**
 * Contexte fiscal du foyer, transmis par le profil (SPEC §4.7, FISCAL_RULES.md §1).
 * Permet de calculer l'impôt réel (barème, quotient familial, décote) au lieu d'appliquer une TMI.
 */
export interface TaxContext {
  situation: 'single' | 'married' | 'divorced' | 'widowed'
  children: { id: number; birth: YearMonth; attachment: 'none' | '21' | '25'; disabled: boolean }[]
  /** Personne seule vivant seule : condition de la demi-part de parent isolé. */
  livesAlone: boolean
  /** Revenu net imposable du foyer pendant la phase d'épargne, hors placement simulé (supposé constant). */
  income: number
  /** Revenu net imposable du foyer à la retraite, hors PER simulé (null : non renseigné). */
  retirementIncome: number | null
  /** Pensions brutes du foyer à la retraite, pour le plafond de l'abattement de 10 % (null : non renseigné). */
  retirementPensions: number | null
}

/** Paramètres d'un placement : valeurs simples indexées par clé, mouvements ponctuels, calendrier de TMI, contexte fiscal. */
export type SimParams = { [key: string]: ParamValue | Movement[] | TmiStep[] | TaxContext | null } & { movements: Movement[] }

export type ParamUnit = 'eur' | 'pct' | 'years' | 'months' | 'age' | 'yearsPerDecade'

/** Modification de paramètres produite par une action (plusieurs clés possibles, mouvements compris). */
export type ParamPatch = { [key: string]: ParamValue | Movement[] | TmiStep[] | TaxContext | null }

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
  /** Valeurs possibles calculées selon les paramètres (prioritaire sur `options`). */
  optionsFor?: (p: SimParams) => readonly (string | number)[]
  /** Calendrier de TMI à résumer sous le champ (« 11 % jusqu'en 2031, puis 30 % »). */
  tmiNote?: (p: SimParams) => TmiStep[] | null
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
  /** TMI appliquée cette année-là (%), si le placement en dépend ; null sinon. */
  tmi: number | null
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
  /** Vrai si le montant est une estimation (table de mortalité), faux s'il vient d'un taux de conversion contractuel saisi. */
  estimated: boolean
  /** Prix d'un euro de rente retenu (table TGF05), ou null pour un taux de conversion. */
  annuityPrice: number | null
  /** Âge équivalent utilisé dans la table (âge de départ, diminué du décalage si la table n'est pas garantie). */
  tableAge: number | null
  /** Rente nette annuelle avec une table garantie à la souscription (si la table ne l'est pas). */
  guaranteedNetYearly: number | null
  /** Âge de fin de simulation et total des rentes nettes perçues jusque-là (null si indicative). */
  endAge: number | null
  totalNet: number | null
  /** Capital net d'impôt qu'aurait donné la même part en sortie en capital (base de comparaison). */
  capitalAlternativeNet: number
  /** Âge à partir duquel les rentes nettes cumulées dépassent ce capital net. */
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
