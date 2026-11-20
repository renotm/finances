/** Flux de trésorerie du point de vue de l'épargnant : négatif = sortie de poche, positif = encaissement. */
export interface Flow {
  /** Mois du flux (0 = premier mois). */
  i: number
  amount: number
}

/**
 * Taux de rendement interne annualisé (TRI), par dichotomie sur un taux mensuel.
 * Renvoie null si les flux ne permettent pas de le calculer (pas de changement de signe).
 */
export function annualIrr(flows: Flow[]): number | null {
  const fs = flows.filter((f) => Math.abs(f.amount) > 1e-9)
  if (!fs.some((f) => f.amount < 0) || !fs.some((f) => f.amount > 0)) return null

  const npv = (r: number) => fs.reduce((acc, f) => acc + f.amount / Math.pow(1 + r, f.i), 0)
  // Bornes mensuelles de −50 % à +50 % (soit environ −100 % à +12 900 % par an) :
  // assez larges pour tout cas réaliste, sans débordement numérique sur 60 ans.
  let lo = -0.5
  let hi = 0.5
  let fLo = npv(lo)
  const fHi = npv(hi)
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null

  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-9) {
      lo = hi = mid
      break
    }
    if (fLo * fMid < 0) hi = mid
    else {
      lo = mid
      fLo = fMid
    }
  }
  const monthly = (lo + hi) / 2
  return Math.pow(1 + monthly, 12) - 1
}
