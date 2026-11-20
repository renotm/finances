import type { Annuity, ExtraLine, Point, SimResult, Warning, YearRow } from '../types'
import { addMonths, formatYM, toDecimalYear, type YM } from './dates'
import { irrAnalysis, type Flow } from './irr'

type SumField = 'deposits' | 'withdrawals' | 'gains' | 'fees' | 'taxes' | 'taxSavings' | 'annuityGross' | 'annuityNet'

/**
 * Collecte, au fil de la simulation, les lignes annuelles, les points du graphique,
 * les flux de trésorerie (pour le rendement annuel) et les avertissements.
 *
 * Convention de temps des flux : un mouvement du mois i a lieu au début du mois (temps i) ;
 * un événement de fin de mois (intérêts, impôt annuel, valeur finale) a lieu au temps i + 1.
 */
export class Recorder {
  private rows = new Map<number, YearRow>()
  private points: Point[] = []
  private grossFlows: Flow[] = []
  private netFlows: Flow[] = []
  private warnings: Warning[] = []
  private t0: number

  constructor(private start: YM) {
    this.t0 = toDecimalYear(start)
  }

  private row(year: number): YearRow {
    let r = this.rows.get(year)
    if (!r) {
      r = {
        year,
        deposits: 0,
        withdrawals: 0,
        gains: 0,
        fees: 0,
        taxes: 0,
        taxSavings: 0,
        annuityGross: 0,
        annuityNet: 0,
        tmi: null,
        endValue: 0,
        netValue: 0,
      }
      this.rows.set(year, r)
    }
    return r
  }

  private add(year: number, field: SumField, v: number) {
    if (v !== 0) this.row(year)[field] += v
  }

  deposit(i: number, year: number, v: number) {
    if (v <= 0) return
    this.add(year, 'deposits', v)
    this.grossFlows.push({ i, amount: -v })
    this.netFlows.push({ i, amount: -v })
  }

  /** Retrait : montant brut retiré du placement, et montant réellement encaissé après impôts. */
  withdraw(i: number, year: number, gross: number, net: number) {
    if (gross <= 0) return
    this.add(year, 'withdrawals', gross)
    this.grossFlows.push({ i, amount: gross })
    this.netFlows.push({ i, amount: net })
  }

  gain(year: number, v: number) {
    this.add(year, 'gains', v)
  }

  fee(year: number, v: number) {
    this.add(year, 'fees', v)
  }

  tax(year: number, v: number) {
    this.add(year, 'taxes', v)
  }

  /** Impôt payé de sa poche en fin de mois i (ex. : impôt annuel sur les intérêts d'un livret bancaire). */
  taxOutOfPocket(i: number, year: number, v: number) {
    if (v <= 0) return
    this.add(year, 'taxes', v)
    this.netFlows.push({ i: i + 1, amount: -v })
  }

  /** Régularisation d'impôt en fin de mois i, payée (positive) ou remboursée (négative) hors du placement. */
  taxAdjustment(i: number, year: number, v: number) {
    if (v === 0) return
    this.add(year, 'taxes', v)
    this.netFlows.push({ i: i + 1, amount: -v })
  }

  /** Économie d'impôt obtenue en fin de mois i. */
  saving(i: number, year: number, v: number) {
    if (v <= 0) return
    this.add(year, 'taxSavings', v)
    this.netFlows.push({ i: i + 1, amount: v })
  }

  /** TMI appliquée une année donnée (en %), affichée dans le tableau quand elle varie. */
  setTmi(year: number, tmi: number) {
    this.row(year).tmi = tmi
  }

  /** Rente versée à la fin du mois i : montant brut et impôts prélevés. */
  annuity(i: number, year: number, gross: number, tax: number) {
    if (gross <= 0) return
    this.add(year, 'annuityGross', gross)
    this.add(year, 'annuityNet', gross - tax)
    this.add(year, 'taxes', tax)
    this.grossFlows.push({ i: i + 1, amount: gross })
    this.netFlows.push({ i: i + 1, amount: gross - tax })
  }

  warn(code: string, params?: Record<string, string | number>) {
    const key = code + JSON.stringify(params ?? {})
    if (!this.warnings.some((w) => w.code + JSON.stringify(w.params ?? {}) === key)) {
      this.warnings.push(params ? { code, params } : { code })
    }
  }

  startPoint(gross: number, net: number) {
    this.points.push({ t: this.t0, date: formatYM(this.start), isStart: true, gross, net })
  }

  /** Clôture de fin d'année (ou de fin de simulation) à la fin du mois i. */
  close(i: number, year: number, gross: number, net: number) {
    const r = this.row(year)
    r.endValue = gross
    r.netValue = net
    this.points.push({
      t: this.t0 + (i + 1) / 12,
      date: formatYM(addMonths(this.start, i)),
      isStart: false,
      gross,
      net,
    })
  }

  /**
   * @param months durée de la simulation en mois
   * @param exitTaxes impôts dus en cas de retrait total à la fin
   * @param netFinalFlow montant encaissé à la fin dans la vue nette (hors flux déjà comptés en cours de route)
   * @param grossFinalFlow idem en vue brute (par défaut la valeur finale brute)
   */
  finish(args: {
    months: number
    finalGross: number
    finalNet: number
    exitTaxes: number
    netFinalFlow: number
    grossFinalFlow?: number
    annuity?: Annuity
    extraLines?: ExtraLine[]
  }): SimResult {
    const years = [...this.rows.values()].sort((a, b) => a.year - b.year)
    const sum = (f: SumField) => years.reduce((acc, r) => acc + r[f], 0)
    const grossFlows = [...this.grossFlows, { i: args.months, amount: args.grossFinalFlow ?? args.finalGross }]
    const netFlows = [...this.netFlows, { i: args.months, amount: args.netFinalFlow }]
    const grossIrr = irrAnalysis(grossFlows)
    const netIrr = irrAnalysis(netFlows)

    return {
      points: this.points,
      years,
      warnings: this.warnings,
      annuity: args.annuity,
      extraLines: args.extraLines,
      flows: { gross: grossFlows, net: netFlows },
      summary: {
        totalDeposited: sum('deposits'),
        totalWithdrawn: sum('withdrawals'),
        finalGross: args.finalGross,
        finalNet: args.finalNet,
        gains: sum('gains'),
        fees: sum('fees'),
        taxes: sum('taxes') + args.exitTaxes,
        taxSavings: sum('taxSavings'),
        reinvestedSavings: this.reinvestedTotal,
        annualReturnGross: grossIrr.rate,
        annualReturnNet: netIrr.rate,
        annualReturnGrossStatus: grossIrr.status,
        annualReturnNetStatus: netIrr.status,
        horizonMonths: args.months,
      },
    }
  }

  private reinvestedTotal = 0

  /** Versement du mois i financé par une économie d'impôt réinvestie (ne compte pas dans l'effort d'épargne). */
  reinvest(v: number) {
    this.reinvestedTotal += Math.max(0, v)
  }
}
