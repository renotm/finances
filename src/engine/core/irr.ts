/** Flux de trésorerie du point de vue de l'épargnant : négatif = sortie de poche, positif = encaissement. */
export interface Flow {
  /** Mois du flux (0 = premier mois). */
  i: number
  amount: number
}

/** Valeur actuelle des flux au taux mensuel r. */
function npv(fs: Flow[], r: number): number {
  return fs.reduce((acc, f) => acc + f.amount / Math.pow(1 + r, f.i), 0)
}

/** Bornes du taux mensuel exploré : −50 % à +50 % (≈ −100 % à +12 900 % par an), sans débordement sur 60 ans. */
const LO = -0.5
const HI = 0.5
const GRID = 400

function bisect(fs: Flow[], lo: number, hi: number): number {
  let fLo = npv(fs, lo)
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    const fMid = npv(fs, mid)
    if (Math.abs(fMid) < 1e-9) return mid
    if (fLo * fMid < 0) hi = mid
    else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}

export type IrrStatus = 'ok' | 'multiple' | 'none'

/**
 * Taux de rendement interne annualisé (TRI) et sa pertinence (SPEC §3.6).
 * La valeur actuelle des flux est évaluée sur une grille de taux : un seul changement de signe donne un TRI unique ;
 * plusieurs changements signalent des TRI multiples (le TRI n'est alors pas un indicateur pertinent) ;
 * aucun changement (flux tous de même signe, ou aucune racine dans les bornes) : TRI indéterminé.
 */
export function irrAnalysis(flows: Flow[]): { rate: number | null; status: IrrStatus } {
  const fs = flows.filter((f) => Math.abs(f.amount) > 1e-9)
  if (!fs.some((f) => f.amount < 0) || !fs.some((f) => f.amount > 0)) return { rate: null, status: 'none' }
  const roots: number[] = []
  let prevR = LO
  let prevV = npv(fs, LO)
  for (let k = 1; k <= GRID; k++) {
    const r = LO + ((HI - LO) * k) / GRID
    const v = npv(fs, r)
    if (!Number.isFinite(v) || !Number.isFinite(prevV)) {
      prevR = r
      prevV = v
      continue
    }
    if (prevV === 0) roots.push(prevR)
    else if (prevV * v < 0) roots.push(bisect(fs, prevR, r))
    prevR = r
    prevV = v
  }
  if (roots.length === 0) return { rate: null, status: 'none' }
  if (roots.length > 1) return { rate: null, status: 'multiple' }
  return { rate: Math.pow(1 + roots[0], 12) - 1, status: 'ok' }
}

/** TRI annualisé, ou null s'il est indéterminé ou multiple. */
export function annualIrr(flows: Flow[]): number | null {
  return irrAnalysis(flows).rate
}

/** Valeur actuelle des flux, actualisés au taux annuel `annualRate` (ex. : inflation), en euros du début. */
export function presentValue(flows: Flow[], annualRate: number): number {
  const monthly = Math.pow(1 + annualRate, 1 / 12) - 1
  return npv(flows, monthly)
}

/** Rendement réel : (1 + rendement nominal) ÷ (1 + inflation) − 1. */
export function realReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1
}
