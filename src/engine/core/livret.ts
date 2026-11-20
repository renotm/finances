import type { SimParams, SimResult } from '../types'
import { iterateMonths, parseYM } from './dates'
import { amount, durationMonths, num, str } from './params'
import { Recorder } from './recorder'
import { buildSchedule } from './schedule'

export interface LivretOptions {
  /** Plafond de versements (0 = sans plafond). */
  cap: number
  /** Intérêts d'une quinzaine pour un solde donné, au mois i. */
  interest: (balance: number, i: number) => number
  /** Taux global d'imposition des intérêts (0 = exonéré). Impôt payé chaque année, hors du livret. */
  taxRate: number
}

/**
 * Livret d'épargne, intérêts calculés par quinzaines (24 par an) :
 * - un versement du 1er du mois porte intérêt à partir du 16 (quinzaine suivante) ;
 * - un retrait du 1er du mois cesse de porter intérêt dès le 1er (quinzaine en cours) ;
 * - les intérêts sont crédités et capitalisés au 31 décembre, ou à la fin de la simulation (clôture).
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
  let taxesPaid = 0
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
      balance += accrued
      rec.gain(m.year, accrued)
      const tax = Math.max(0, accrued) * opt.taxRate
      taxesPaid += tax
      rec.taxOutOfPocket(m.i, m.year, tax)
      accrued = 0
      rec.close(m.i, m.year, balance, balance - taxesPaid)
    }
  }

  if (blockedMonths > 0) rec.warn('capReached', { cap: opt.cap, count: blockedMonths })

  return rec.finish({
    months,
    finalGross: balance,
    finalNet: balance - taxesPaid,
    exitTaxes: 0,
    netFinalFlow: balance,
  })
}
