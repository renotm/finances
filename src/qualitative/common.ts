/** Éléments partagés par plusieurs placements (SPEC §5.7). */
import type { QualItem } from './types'
import { isCouple } from './helpers'

/** Compte ou livret bancaire au décès : dans la succession, sans bénéficiaire désigné. */
export const accountTransmission: QualItem[] = [
  {
    nature: 'legal',
    text: {
      fr: 'Le solde entre dans la succession et revient aux héritiers selon les règles successorales.',
      en: 'The balance is part of the estate and goes to the heirs under inheritance rules.',
    },
    sources: ['sp-comptes-deces'],
  },
  {
    nature: 'legal',
    text: {
      fr: 'Aucun bénéficiaire ne peut être désigné sur le livret lui-même.',
      en: 'No beneficiary can be named on the account itself.',
    },
  },
  {
    nature: 'legal',
    when: isCouple,
    text: {
      fr: 'Le conjoint marié ou le partenaire de PACS est exonéré de droits de succession sur ce qu\'il reçoit.',
      en: 'A married spouse or PACS partner pays no inheritance tax on what they receive.',
    },
    sources: ['bofip-av-deces'],
  },
]

/** Comptes bancaires après le décès (Service-Public F1451). */
export const accountAfterDeath: QualItem[] = [
  {
    nature: 'legal',
    text: {
      fr: 'Les comptes et livrets individuels sont bloqués dès que la banque est informée du décès, jusqu\'au règlement de la succession.',
      en: 'Individual accounts and savings accounts are frozen once the bank is told of the death, until the estate is settled.',
    },
    sources: ['sp-comptes-deces'],
  },
  {
    nature: 'legal',
    text: {
      fr: 'Les frais d\'obsèques, de dernière maladie et les impôts du défunt peuvent être réglés sur ses comptes, dans la limite de 5 965 €.',
      en: 'Funeral costs, last-illness care and the deceased\'s taxes can be paid from their accounts, up to €5,965.',
    },
    sources: ['sp-comptes-deces'],
  },
  {
    nature: 'practice',
    text: {
      fr: 'Le règlement d\'une succession prend souvent plusieurs mois. Le délai de six mois est celui de la déclaration de succession, pas celui du déblocage des fonds.',
      en: 'Settling an estate often takes several months. The six-month deadline applies to the inheritance tax return, not to the release of funds.',
    },
    sources: ['sp-declaration-succession'],
  },
]

/** Catégorie « rente viagère » sans objet hors PER. */
export const noAnnuity = { notApplicable: true, items: [] }

/** Rendement futur non garanti et inflation, pour les livrets. */
export const livretRateRisk: QualItem = {
  nature: 'legal',
  text: {
    fr: 'Le taux peut baisser ; si l\'inflation le dépasse, le pouvoir d\'achat de l\'épargne diminue.',
    en: 'The rate can fall; if inflation exceeds it, the savings lose purchasing power.',
  },
}
