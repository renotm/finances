/**
 * PER (SPEC §5.7). La forme du PER (assurance ou compte-titres bancaire) n'est pas un paramètre : les deux cas sont
 * présentés. Au décès, la fiscalité du PER assurance dépend de l'âge du titulaire au décès (et non au versement).
 */
import { config } from '../config/defaults'
import type { SimParams } from '../engine/types'
import { insurancePayout, spouseBeneficiary } from './assuranceVie'
import { enteredFees, supportRisks } from './contract'
import { pctText } from './helpers'
import type { QualProfile } from './types'

const deducted = (p: SimParams) => p.deducted !== false
const exit = (p: SimParams) => (typeof p.exitMode === 'string' ? p.exitMode : 'capital')
const paysAnnuity = (p: SimParams) => exit(p) !== 'capital'

export const perQual: QualProfile = {
  productId: 'per',
  methodAnchor: 'per',
  categories: {
    availability: {
      items: [
        { nature: 'legal', text: { fr: 'Épargne bloquée jusqu\'au départ à la retraite.', en: 'Savings are locked until retirement.' }, sources: ['sp-per'] },
        {
          nature: 'legal',
          text: {
            fr: 'Déblocage anticipé possible pour l\'achat de la résidence principale et en cas d\'accident de la vie (invalidité, décès du conjoint ou du partenaire de PACS, surendettement, fin de droits au chômage…).',
            en: 'Early release possible to buy a main residence and in the event of a life accident (disability, death of the spouse or PACS partner, over-indebtedness, end of unemployment benefits…).',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'Transfert vers un autre PER possible : frais limités à 1 % pendant les 5 premières années, gratuit ensuite.',
            en: 'Transfer to another PER possible: fees capped at 1% during the first 5 years, free afterwards.',
          },
          sources: ['sp-per'],
        },
      ],
    },
    risks: {
      items: [
        ...supportRisks,
        {
          nature: 'contract',
          text: {
            fr: 'La protection en cas de défaillance de l\'établissement dépend de la forme du PER (contrat d\'assurance ou compte-titres) : à vérifier auprès de lui.',
            en: 'Protection if the provider fails depends on the form of the PER (insurance contract or securities account): to be checked with the provider.',
          },
        },
        {
          nature: 'legal',
          text: {
            fr: 'Fiscalité de sortie incertaine : les règles et votre situation à la retraite peuvent changer.',
            en: 'Exit taxation is uncertain: the rules and your situation at retirement may change.',
          },
        },
      ],
    },
    fees: {
      items: [
        ...enteredFees,
        {
          nature: 'contract',
          when: paysAnnuity,
          text: (p: SimParams) => {
            const fee = pctText(typeof p.arrearsFee === 'number' ? p.arrearsFee : config.per.annuity.arrearsFee)
            return { fr: `Frais sur arrérages de la rente saisis : ${fee.fr}.`, en: `Annuity payment fees entered: ${fee.en}.` }
          },
        },
        { nature: 'legal', text: { fr: 'Pas de plafond de versement ; seule la déduction est plafonnée.', en: 'No cap on payments; only the deduction is capped.' }, sources: ['sp-per'] },
      ],
    },
    tax: {
      items: [
        {
          nature: 'legal',
          when: deducted,
          text: {
            fr: 'Versements déduits du revenu imposable dans la limite du plafond ; en contrepartie, le capital ou la rente issus de ces versements sont imposés à la sortie.',
            en: 'Payments deducted from taxable income within the ceiling; in return, the capital or annuity they produce is taxed on exit.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'legal',
          when: (p) => !deducted(p),
          text: {
            fr: 'Versements non déduits : pas d\'économie d\'impôt à l\'entrée ; à la sortie en capital, seuls les gains sont imposés.',
            en: 'Payments not deducted: no tax saving on entry; on a capital exit, only the gains are taxed.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'legal',
          text: (p: SimParams) =>
            exit(p) === 'capital'
              ? { fr: 'Sortie en capital prévue : gains soumis au prélèvement forfaitaire unique.', en: 'Capital exit planned: gains subject to the flat tax.' }
              : exit(p) === 'annuity'
                ? { fr: 'Sortie en rente prévue : rente imposée chaque année, en partie selon l\'âge.', en: 'Annuity exit planned: the annuity is taxed every year, partly according to age.' }
                : { fr: 'Sortie mixte prévue : capital et rente imposés chacun selon ses règles.', en: 'Mixed exit planned: capital and annuity each taxed under their own rules.' },
        },
      ],
    },
    transmission: {
      items: [
        {
          nature: 'contract',
          text: {
            fr: 'Avant la liquidation, l\'épargne est transmise : aux bénéficiaires désignés pour un PER assurance, aux héritiers (dans la succession) pour un PER bancaire.',
            en: 'Before payout starts, the savings are passed on: to the named beneficiaries for an insurance PER, to the heirs (through the estate) for a bank PER.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'PER assurance : la fiscalité dépend de l\'âge du titulaire au décès, et non de l\'âge au versement.',
            en: 'Insurance PER: taxation depends on the holder\'s age at death, not at the time of payment.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'legal',
          text: {
            fr: 'Décès avant 70 ans : abattement de 152 500 € par bénéficiaire, puis prélèvement de 20 % et 31,25 %. Décès à partir de 70 ans : droits de succession au-delà de 30 500 €, gains compris.',
            en: 'Death before 70: allowance of €152,500 per beneficiary, then a 20% and 31.25% levy. Death from 70: inheritance tax above €30,500, gains included.',
          },
          sources: ['sp-per', 'cgi-757-b'],
        },
        spouseBeneficiary,
      ],
    },
    afterDeath: {
      items: [
        { ...insurancePayout[0], nature: 'contract', text: { fr: 'PER assurance : capital versé aux bénéficiaires en principe hors succession.', en: 'Insurance PER: capital paid to the beneficiaries, in principle outside the estate.' } },
        { ...insurancePayout[1], text: { fr: 'PER assurance : paiement dans le mois qui suit la réception des pièces, comme une assurance vie.', en: 'Insurance PER: payment within one month of receiving the documents, as for life insurance.' } },
        {
          nature: 'contract',
          text: {
            fr: 'PER bancaire : les titres entrent dans la succession et restent bloqués jusqu\'à son règlement.',
            en: 'Bank PER: the securities are part of the estate and stay frozen until it is settled.',
          },
          sources: ['sp-per', 'sp-comptes-deces'],
        },
      ],
    },
    annuity: {
      items: [
        {
          nature: 'legal',
          when: (p) => !paysAnnuity(p),
          text: {
            fr: 'Sortie en capital prévue dans cette colonne : ces points ne s\'appliquent que si une partie est convertie en rente.',
            en: 'Capital exit planned in this column: these points only apply if part is converted into an annuity.',
          },
        },
        {
          nature: 'legal',
          text: {
            fr: 'Rente simple : versée jusqu\'au décès, puis arrêtée ; l\'épargne restante n\'est pas transmise.',
            en: 'Simple annuity: paid until death, then stops; the remaining savings are not passed on.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'contract',
          text: {
            fr: 'Réversion : après le décès, tout ou partie de la rente continue d\'être versée au conjoint ou au bénéficiaire désigné.',
            en: 'Reversion: after death, all or part of the annuity continues to be paid to the spouse or named beneficiary.',
          },
          sources: ['sp-per'],
        },
        {
          nature: 'contract',
          text: {
            fr: 'Annuités garanties : en cas de décès pendant la période garantie, les rentes restantes de cette période sont versées aux bénéficiaires.',
            en: 'Guaranteed annuities: if death occurs during the guaranteed period, the remaining payments of that period go to the beneficiaries.',
          },
        },
        {
          nature: 'contract',
          text: {
            fr: 'Ces garanties réduisent le montant de la rente. Le simulateur calcule une rente simple, sans réversion ni annuités garanties.',
            en: 'These guarantees reduce the annuity amount. The simulator calculates a simple annuity, with no reversion or guaranteed payments.',
          },
        },
      ],
    },
  },
}
