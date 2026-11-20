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

/**
 * Grille des taux mensuels explorés (SPEC §3.6, limites documentées dans FISCAL_RULES.md §6) :
 * - bornes −50 % à +50 % par mois (≈ −100 % à +12 900 % par an), sans débordement numérique sur 60 ans ;
 * - pas fin de 0,01 point par mois (≈ 0,12 point par an) entre −2 % et +5 % par mois (≈ −21,5 % à +79,6 % par an),
 *   la plage des placements réalistes ; pas de 0,25 point par mois ailleurs.
 * Limites : deux TRI plus proches que le pas local peuvent tomber dans le même intervalle et ne pas être détectés ;
 * une racine double (valeur actuelle tangente à zéro sans changement de signe) n'est pas détectée ; un TRI hors des
 * bornes n'est pas trouvé.
 */
const LO = -0.5
const HI = 0.5
const COARSE_STEP = 0.0025
const FINE_LO = -0.02
const FINE_HI = 0.05
const FINE_STEP = 0.0001

function buildGrid(): number[] {
  const pts = new Set<number>()
  const add = (from: number, to: number, step: number) => {
    const n = Math.round((to - from) / step)
    for (let k = 0; k <= n; k++) pts.add(Math.round((from + k * step) * 1e9) / 1e9)
  }
  add(LO, HI, COARSE_STEP)
  add(FINE_LO, FINE_HI, FINE_STEP)
  return [...pts].sort((a, b) => a - b)
}
const GRID_POINTS = buildGrid()

/** Regroupe les flux d'un même mois (moins de termes à actualiser). */
function aggregate(flows: Flow[]): Flow[] {
  const byMonth = new Map<number, number>()
  for (const f of flows) byMonth.set(f.i, (byMonth.get(f.i) ?? 0) + f.amount)
  return [...byMonth].map(([i, amount]) => ({ i, amount })).filter((f) => Math.abs(f.amount) > 1e-9)
}

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
  const fs = aggregate(flows)
  if (!fs.some((f) => f.amount < 0) || !fs.some((f) => f.amount > 0)) return { rate: null, status: 'none' }
  const roots: number[] = []
  let prevR = GRID_POINTS[0]
  let prevV = npv(fs, prevR)
  for (let k = 1; k < GRID_POINTS.length; k++) {
    const r = GRID_POINTS[k]
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
