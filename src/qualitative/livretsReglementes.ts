/** Livret A et LDDS (SPEC §5.7) : mêmes caractéristiques, plafonds différents. */
import { config } from '../config/defaults'
import { accountAfterDeath, accountTransmission, livretRateRisk, noAnnuity } from './common'
import { eurText } from './helpers'
import type { QualProfile } from './types'

function livretReglemente(productId: 'livretA' | 'ldds', cap: number, source: string): QualProfile {
  const capText = eurText(cap)
  return {
    productId,
    methodAnchor: 'livrets',
    categories: {
      availability: {
        items: [
          {
            nature: 'legal',
            text: { fr: 'Versements et retraits à tout moment, sans pénalité ni durée minimale.', en: 'Deposits and withdrawals at any time, with no penalty or minimum term.' },
          },
          {
            nature: 'practice',
            text: {
              fr: 'Un virement vers le compte courant de la même banque est en général immédiat ; vers une autre banque, il prend un à quelques jours ouvrés.',
              en: 'A transfer to a current account at the same bank is usually immediate; to another bank, it takes one to a few business days.',
            },
          },
        ],
      },
      risks: {
        items: [
          {
            nature: 'legal',
            text: { fr: 'Pas de risque de perte en capital : le solde ne baisse que par les retraits.', en: 'No risk of capital loss: the balance only falls through withdrawals.' },
          },
          {
            nature: 'legal',
            text: {
              fr: 'Garantie de l\'État de 100 000 € par client et par banque pour l\'ensemble Livret A, LDDS et LEP, qui s\'ajoute à la garantie des dépôts (FGDR) des autres comptes.',
              en: 'State guarantee of €100,000 per customer and per bank for Livret A, LDDS and LEP combined, on top of the deposit guarantee (FGDR) for other accounts.',
            },
            sources: ['tresor-garantie', 'fgdr'],
          },
          livretRateRisk,
        ],
      },
      fees: {
        items: [
          { nature: 'legal', text: { fr: 'Aucuns frais d\'ouverture, de gestion ni de retrait.', en: 'No opening, management or withdrawal fees.' } },
          {
            nature: 'legal',
            text: {
              fr: `Versements plafonnés à ${capText.fr} ; les intérêts capitalisés peuvent dépasser ce plafond.`,
              en: `Deposits capped at ${capText.en}; capitalised interest may take the balance above it.`,
            },
            sources: [source],
          },
          { nature: 'legal', text: { fr: 'Un seul livret de ce type par personne.', en: 'Only one such account per person.' }, sources: [source] },
        ],
      },
      tax: {
        items: [
          {
            nature: 'legal',
            text: { fr: 'Intérêts exonérés d\'impôt sur le revenu et de prélèvements sociaux, sans condition de durée.', en: 'Interest is exempt from income tax and social charges, with no holding period.' },
            sources: [source],
          },
        ],
      },
      transmission: { items: accountTransmission },
      afterDeath: {
        items: [
          ...accountAfterDeath,
          { nature: 'legal', text: { fr: 'Le livret est toujours individuel : il ne peut pas être ouvert en compte joint.', en: 'The account is always individual: it cannot be held jointly.' }, sources: [source] },
        ],
      },
      annuity: noAnnuity,
    },
  }
}

export const livretAQual = livretReglemente('livretA', config.livretA.cap, 'sp-livret-a')
export const lddsQual = livretReglemente('ldds', config.ldds.cap, 'sp-ldds')
