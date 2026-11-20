/** Couleur de chaque colonne de placement (graphique, cartes, en-têtes). */
export const SLOT_COLORS = ['#2563eb', '#d97706', '#0d9488'] as const

export function slotColor(index: number): string {
  return SLOT_COLORS[index % SLOT_COLORS.length]
}
