/** Livret bancaire fiscalisé (SPEC §5.7). */
import { fiscal } from '../config/fiscal'
import type { SimParams } from '../engine/types'
import { accountAfterDeath, accountTransmission, livretRateRisk, noAnnuity } from './common'
import { pctText } from './helpers'
import type { QualProfile } from './types'

const boosted = (p: SimParams) => typeof p.boostRate === 'number' && p.boostRate > 0
const bareme = (p: SimParams) => p.taxMode === 'bareme'
const pfu = pctText(fiscal.pfuIncomeTax + fiscal.social.capital)

export const livretBancaireQual: QualProfile = {
  productId: 'livretBancaire',
  methodAnchor: 'livret-bancaire',
  categories: {
    availability: {
      items: [
        { nature: 'contract', text: { fr: 'Versements et retraits en général libres, selon les conditions de la banque.', en: 'Deposits and withdrawals are usually free, under the bank\'s terms.' } },
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
        { nature: 'legal', text: { fr: 'Pas de risque de perte en capital : le solde ne baisse que par les retraits et les prélèvements fiscaux.', en: 'No risk of capital loss: the balance only falls through withdrawals and tax deductions.' } },
        {
          nature: 'legal',
          text: {
            fr: 'Garantie des dépôts (FGDR) : 100 000 € par client et par banque, tous comptes et livrets bancaires confondus.',
            en: 'Deposit guarantee (FGDR): €100,000 per customer and per bank, across all accounts and bank savings accounts.',
          },
          sources: ['tresor-garantie', 'fgdr'],
        },
        { nature: 'contract', text: { fr: 'Taux fixé librement par la banque et modifiable à tout moment.', en: 'Rate set freely by the bank and changeable at any time.' } },
        {
          nature: 'contract',
          when: boosted,
          text: { fr: 'Le taux boosté saisi est temporaire ou plafonné selon l\'offre : le rendement baisse ensuite.', en: 'The boosted rate entered is temporary or capped depending on the offer: the return falls afterwards.' },
        },
        livretRateRisk,
      ],
    },
    fees: {
      items: [
        { nature: 'contract', text: { fr: 'En général sans frais ; plafond et conditions propres à chaque banque.', en: 'Usually free of fees; ceiling and terms specific to each bank.' } },
      ],
    },
    tax: {
      items: [
        {
          nature: 'legal',
          when: (p) => !bareme(p),
          text: {
            fr: `Intérêts imposés chaque année au prélèvement forfaitaire unique (${pfu.fr} avec les prélèvements sociaux), retenus par la banque.`,
            en: `Interest is taxed every year at the flat tax (${pfu.en} including social charges), withheld by the bank.`,
          },
          sources: ['eco-livret-bancaire'],
        },
        {
          nature: 'legal',
          when: bareme,
          text: {
            fr: 'Option pour le barème : intérêts imposés au taux marginal, avec une part de CSG déductible ; l\'option vaut pour tous les revenus de placement du foyer.',
            en: 'Progressive scale option: interest taxed at the marginal rate, with part of the CSG deductible; the option applies to all the household\'s investment income.',
          },
          sources: ['eco-livret-bancaire', 'sp-csg'],
        },
        { nature: 'legal', text: { fr: 'Aucun abattement ni avantage lié à la durée de détention.', en: 'No allowance or benefit linked to the holding period.' } },
      ],
    },
    transmission: { items: accountTransmission },
    afterDeath: {
      items: [
        ...accountAfterDeath,
        {
          nature: 'contract',
          text: {
            fr: 'Si la banque permet un livret joint, il reste en principe utilisable par le cotitulaire, sauf opposition d\'un héritier.',
            en: 'If the bank allows a joint account, the co-holder can normally keep using it, unless an heir objects.',
          },
          sources: ['sp-comptes-deces'],
        },
      ],
    },
    annuity: noAnnuity,
  },
}
