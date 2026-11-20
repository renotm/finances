import type { SimParams, SimResult } from '../types'
import { iterateMonths, parseYM } from './dates'
import { amount, durationMonths, num, str } from './params'
import { Recorder } from './recorder'
import { buildSchedule } from './schedule'

/** Fiscalité des intérêts d'une année, au moment de leur inscription au 31 décembre. */
export interface InterestTax {
  /** Montant retenu par la banque sur les intérêts (prélèvements sociaux, acompte de 12,8 %) : il n'est pas capitalisé. */
  withheld: number
  /** Régularisation de l'impôt payée de sa poche (positive) ou remboursée (négative), hors du livret. */
  outOfPocket: number
  /** TMI de l'année (%), à afficher dans le tableau, si l'impôt en dépend. */
  tmi?: number | null
}

export interface LivretOptions {
  /** Plafond de versements (0 = sans plafond). */
  cap: number
  /** Intérêts d'une quinzaine pour un solde donné, au mois i. */
  interest: (balance: number, i: number) => number
  /** Fiscalité des intérêts inscrits (absent : intérêts exonérés). */
  tax?: (year: number, interest: number) => InterestTax
}

const cents = (x: number) => Math.round(x * 100) / 100

/**
 * Livret d'épargne, intérêts calculés par quinzaines (24 par an) :
 * - un versement du 1er du mois porte intérêt à partir du 16 (quinzaine suivante) ;
 * - un retrait du 1er du mois cesse de porter intérêt dès le 1er (quinzaine en cours) ;
 * - les intérêts sont arrondis au centime, inscrits et capitalisés au 31 décembre, ou à la clôture ;
 * - les retenues de la banque sont déduites avant capitalisation : la valeur brute affichée est le solde réel du livret.
 */
export function simulateLivret(p: SimParams, opt: LivretOptions): SimResult {
  const start = parseYM(str(p, 'start'))
  const months = durationMonths(num(p, 'durationYears'))
  const rec = new Recorder(start)
  const sched = buildSchedule(p, months)
  if (sched.outOfRange > 0) rec.warn('movementOutOfRange', { count: sched.outOfRange })

  let balance = amount(p, 'initialCapital')
  if (opt.cap > 0 && balance > opt.cap) rec.warn('initialAboveCap', { cap: opt.cap })
  rec.deposit(0, start.year, balance)
  rec.startPoint(balance, balance)

  let accrued = 0
  /** Régularisations d'impôt payées (ou remboursées) hors du livret, cumulées. */
  let outOfPocket = 0
  let blockedMonths = 0

  for (const m of iterateMonths(start, months)) {
    const wanted = sched.withdrawals[m.i]
    if (wanted > 0) {
      const w = Math.min(wanted, balance)
      if (w < wanted) rec.warn('withdrawalCapped')
      balance -= w
      rec.withdraw(m.i, m.year, w, w)
    }
    const firstHalf = balance

    const dep = sched.deposits[m.i]
    if (dep > 0) {
      const accepted = opt.cap > 0 ? Math.max(0, Math.min(dep, opt.cap - balance)) : dep
      if (accepted < dep) blockedMonths++
      balance += accepted
      rec.deposit(m.i, m.year, accepted)
    }
    const secondHalf = balance

    accrued += opt.interest(firstHalf, m.i) + opt.interest(secondHalf, m.i)

    if (m.isYearEnd) {
      const interest = cents(accrued)
      const t = opt.tax ? opt.tax(m.year, interest) : { withheld: 0, outOfPocket: 0 }
      balance += interest - t.withheld
      rec.gain(m.year, interest)
      rec.tax(m.year, t.withheld)
      if (t.outOfPocket !== 0) rec.taxAdjustment(m.i, m.year, t.outOfPocket)
      if (t.tmi !== undefined && t.tmi !== null) rec.setTmi(m.year, t.tmi)
      outOfPocket += t.outOfPocket
      accrued = 0
      rec.close(m.i, m.year, balance, balance - outOfPocket)
    }
  }

  if (blockedMonths > 0) rec.warn('capReached', { cap: opt.cap, count: blockedMonths })

  return rec.finish({
    months,
    finalGross: balance,
    finalNet: balance - outOfPocket,
    exitTaxes: 0,
    netFinalFlow: balance,
  })
}
