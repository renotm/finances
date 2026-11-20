/**
 * Registre des caractéristiques qualitatives (SPEC §5.7). Ajouter un placement = ajouter son module ici.
 * Les textes sont résolus avec les paramètres de la colonne : jamais avec le profil actif.
 */
import type { SimParams } from '../engine/types'
import { assuranceVieQual } from './assuranceVie'
import { livretBancaireQual } from './livretBancaire'
import { lddsQual, livretAQual } from './livretsReglementes'
import { perQual } from './per'
import { CATEGORIES, type Locale, type QualProfile, type ResolvedCategory } from './types'

export const QUALITATIVE: QualProfile[] = [livretAQual, lddsQual, livretBancaireQual, assuranceVieQual, perQual]

export function qualitativeProfile(productId: string): QualProfile | undefined {
  return QUALITATIVE.find((q) => q.productId === productId)
}

/** Catégories d'un placement pour une colonne, dans l'ordre commun, avec les textes de la langue demandée. */
export function resolveQualitative(productId: string, params: SimParams, locale: Locale): ResolvedCategory[] {
  const profile = qualitativeProfile(productId)
  if (!profile) return []
  return CATEGORIES.map((id) => {
    const cat = profile.categories[id]
    const items = cat.items
      .filter((item) => !item.when || item.when(params))
      .map((item) => {
        const text = typeof item.text === 'function' ? item.text(params) : item.text
        return { nature: item.nature, text: text[locale], sources: item.sources ?? [] }
      })
    return { id, notApplicable: !!cat.notApplicable, items }
  })
}
