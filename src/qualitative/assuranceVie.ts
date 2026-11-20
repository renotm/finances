/** Assurance vie (SPEC §5.7). Fiscalité au décès selon l'âge de l'assuré au moment de chaque versement. */
import { fiscal } from '../config/fiscal'
import { noAnnuity } from './common'
import { enteredFees, supportRisks } from './contract'
import { eurText, isCouple, pctText } from './helpers'
import type { QualItem, QualProfile } from './types'

const li = fiscal.lifeInsurance
const single = eurText(li.allowanceSingle)
const couple = eurText(li.allowanceCouple)
const social = pctText(fiscal.social.lifeInsurance)

/** Bénéficiaire conjoint : exonéré s'il est désigné, sans le supposer. */
export const spouseBeneficiary: QualItem = {
  nature: 'contract',
  when: isCouple,
  text: {
    fr: 'Le conjoint marié ou le partenaire de PACS est exonéré s\'il est désigné bénéficiaire ; il ne l\'est que si la clause bénéficiaire le prévoit.',
    en: 'A married spouse or PACS partner is exempt if named as beneficiary; they are only a beneficiary if the beneficiary clause says so.',
  },
  sources: ['impots-av-beneficiaire', 'bofip-av-deces'],
}

/** Versement du capital aux bénéficiaires (Code des assurances L132-23-1). */
export const insurancePayout: QualItem[] = [
  {
    nature: 'legal',
    text: {
      fr: 'Le capital est versé aux bénéficiaires en principe indépendamment du règlement de la succession.',
      en: 'The capital is paid to the beneficiaries, in principle independently of the settlement of the estate.',
    },
    sources: ['ca-l132-12'],
  },
  {
    nature: 'legal',
    text: {
      fr: 'L\'assureur doit payer dans le mois qui suit la réception de toutes les pièces demandées ; au-delà, des intérêts de retard sont dus.',
      en: 'The insurer must pay within one month of receiving all the documents requested; late interest is due after that.',
    },
    sources: ['ca-l132-23-1'],
  },
  {
    nature: 'practice',
    text: {
      fr: 'Identifier les bénéficiaires et réunir les pièces prend du temps : le délai total n\'est pas garanti.',
      en: 'Identifying the beneficiaries and gathering the documents takes time: the overall delay is not guaranteed.',
    },
  },
]

export const assuranceVieQual: QualProfile = {
  productId: 'assuranceVie',
  methodAnchor: 'assurance-vie',
  categories: {
    availability: {
      items: [
        { nature: 'legal', text: { fr: 'Rachat partiel ou total possible à tout moment ; aucun blocage.', en: 'Partial or full surrender possible at any time; no lock-in.' } },
        {
          nature: 'legal',
          text: { fr: 'L\'assureur verse la valeur de rachat dans un délai maximal de deux mois.', en: 'The insurer pays the surrender value within two months at most.' },
          sources: ['ca-l132-21'],
        },
        { nature: 'practice', text: { fr: 'Les rachats sont souvent versés en quelques jours.', en: 'Surrenders are often paid within a few days.' } },
      ],
    },
    risks: {
      items: [
        ...supportRisks,
        {
          nature: 'legal',
          text: {
            fr: 'En cas de défaillance de l\'assureur, le fonds de garantie des assurances de personnes (FGAP) couvre jusqu\'à 70 000 € par personne.',
            en: 'If the insurer fails, the life insurance guarantee fund (FGAP) covers up to €70,000 per person.',
          },
          sources: ['ca-r423-7'],
        },
      ],
    },
    fees: {
      items: [
        ...enteredFees,
        { nature: 'legal', text: { fr: 'Pas de plafond de versement.', en: 'No cap on payments.' } },
        { nature: 'contract', text: { fr: 'En général pas de frais de rachat ; à vérifier dans le contrat.', en: 'Usually no surrender fees; to be checked in the contract.' } },
      ],
    },
    tax: {
      items: [
        {
          nature: 'legal',
          text: {
            fr: `Seuls les gains contenus dans un rachat sont imposés ; après 8 ans, taux réduit et abattement annuel de ${single.fr} (${couple.fr} pour un couple).`,
            en: `Only the gains included in a surrender are taxed; after 8 years, reduced rate and annual allowance of ${single.en} (${couple.en} for a couple).`,
          },
          sources: ['legifrance-125-0-a'],
        },
        {
          nature: 'legal',
          text: {
            fr: `Prélèvements sociaux de ${social.fr} : chaque année sur le fonds en euros, au rachat sur les unités de compte.`,
            en: `Social charges of ${social.en}: every year on the euro fund, on surrender for unit-linked funds.`,
          },
          sources: ['sp-csg'],
        },
      ],
    },
    transmission: {
      items: [
        {
          nature: 'legal',
          text: {
            fr: 'Le capital revient aux bénéficiaires désignés dans la clause bénéficiaire, hors succession.',
            en: 'The capital goes to the beneficiaries named in the beneficiary clause, outside the estate.',
          },
          sources: ['ca-l132-12'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'La fiscalité dépend de l\'âge de l\'assuré au moment de chaque versement.',
            en: 'Taxation depends on the policyholder\'s age when each payment was made.',
          },
          sources: ['impots-av-beneficiaire'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'Versements avant 70 ans : abattement de 152 500 € par bénéficiaire, puis prélèvement de 20 % jusqu\'à 700 000 € et 31,25 % au-delà.',
            en: 'Payments before age 70: allowance of €152,500 per beneficiary, then a 20% levy up to €700,000 and 31.25% above.',
          },
          sources: ['cgi-990-i', 'impots-av-beneficiaire'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'Versements à partir de 70 ans : droits de succession sur les primes au-delà de 30 500 € (abattement global, tous contrats) ; les gains sont exonérés.',
            en: 'Payments from age 70: inheritance tax on premiums above €30,500 (one allowance for all contracts); gains are exempt.',
          },
          sources: ['cgi-757-b', 'bofip-av-deces'],
        },
        spouseBeneficiary,
      ],
    },
    afterDeath: { items: insurancePayout },
    annuity: noAnnuity,
  },
}
