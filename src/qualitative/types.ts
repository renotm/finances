/**
 * Caractéristiques qualitatives des placements (SPEC §5.7) : disponibilité, risques, frais, fiscalité, transmission.
 * Données sans dépendance à Vue ; un module par placement. Aucun calcul financier.
 */
import type { SimParams } from '../engine/types'

/** Les 7 catégories, dans l'ordre d'affichage (identique pour tous les placements). */
export const CATEGORIES = ['availability', 'risks', 'fees', 'tax', 'transmission', 'afterDeath', 'annuity'] as const
export type CategoryId = (typeof CATEGORIES)[number]

/**
 * Nature d'une information : règle légale ou réglementaire, pratique habituelle (non garantie),
 * disposition qui dépend du contrat ou de l'établissement.
 */
export type Nature = 'legal' | 'practice' | 'contract'

export type Locale = 'fr' | 'en'
export interface Text {
  fr: string
  en: string
}

export interface QualItem {
  nature: Nature
  /** Texte, éventuellement construit à partir des paramètres de la colonne. */
  text: Text | ((p: SimParams) => Text)
  /** Condition d'affichage selon les paramètres de la colonne (jamais le profil actif). */
  when?: (p: SimParams) => boolean
  /** Références (identifiants de `src/methodology/sources.ts`). */
  sources?: string[]
}

export interface QualCategory {
  /** Catégorie sans objet pour ce placement (ex. : rente viagère hors PER). */
  notApplicable?: boolean
  items: QualItem[]
}

export interface QualProfile {
  productId: string
  categories: Record<CategoryId, QualCategory>
  /** Section de la page « Méthodologie et sources » qui détaille ce placement. */
  methodAnchor: string
}

/** Catégorie prête à afficher pour une colonne. */
export interface ResolvedCategory {
  id: CategoryId
  notApplicable: boolean
  items: { nature: Nature; text: string; sources: string[] }[]
}
