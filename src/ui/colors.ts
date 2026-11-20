/**
 * Couleur de chaque colonne de placement (graphique, cartes, en-têtes) : les teintes de pistes du thème Bloom
 * (terre cuite, ocre, terre d'ombre), en hexadécimal car le graphique y concatène une opacité.
 */
export const SLOT_COLORS = ['#af4529', '#996516', '#675040'] as const

export function slotColor(index: number): string {
  return SLOT_COLORS[index % SLOT_COLORS.length]
}
