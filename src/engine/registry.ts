import { assuranceVie } from './products/assuranceVie'
import { livretBancaire } from './products/livretBancaire'
import { ldds, livretA } from './products/livretReglemente'
import { per } from './products/per'
import type { Product } from './types'

/** Placements disponibles, dans l'ordre d'affichage. Pour en ajouter un : créer son module et l'inscrire ici. */
export const products: Product[] = [livretA, ldds, livretBancaire, assuranceVie, per]

export function getProduct(id: string): Product {
  const p = products.find((x) => x.id === id)
  if (!p) throw new Error(`Placement inconnu : ${id}`)
  return p
}
