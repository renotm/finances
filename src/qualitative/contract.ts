/** Éléments communs aux contrats multisupports (assurance vie, PER) : supports, frais saisis (SPEC §5.7). */
import type { SimParams } from '../engine/types'
import { feeOf, hasEuro, hasUc, pctText, ucShare } from './helpers'
import type { QualItem } from './types'

export const supportRisks: QualItem[] = [
  {
    nature: 'contract',
    when: hasEuro,
    text: {
      fr: 'Fonds en euros : capital garanti par l\'assureur, en général net des frais de gestion ; le rendement est fixé chaque année.',
      en: 'Euro fund: capital guaranteed by the insurer, usually net of management fees; the return is set each year.',
    },
  },
  {
    nature: 'legal',
    when: hasUc,
    text: (p: SimParams) => {
      const share = pctText(ucShare(p))
      return {
        fr: `Unités de compte (${share.fr} des versements dans cette colonne) : risque de perte en capital ; seul le nombre de parts est garanti, pas leur valeur.`,
        en: `Unit-linked funds (${share.en} of payments in this column): risk of capital loss; only the number of units is guaranteed, not their value.`,
      }
    },
  },
  {
    nature: 'legal',
    text: {
      fr: 'Rendements futurs non garantis : la simulation retient un taux moyen constant.',
      en: 'Future returns are not guaranteed: the simulation uses a constant average rate.',
    },
  },
]

/** Frais saisis dans la colonne, cités tels quels. */
export const enteredFees: QualItem[] = [
  {
    nature: 'contract',
    text: (p: SimParams) => {
      const fee = feeOf(p, 'entryFee')
      const t = pctText(fee)
      return fee > 0
        ? { fr: `Frais sur versements saisis : ${t.fr}.`, en: `Entry fees entered: ${t.en}.` }
        : { fr: 'Aucun frais sur versements saisi ; certains contrats en prélèvent.', en: 'No entry fee entered; some contracts charge them.' }
    },
  },
  {
    nature: 'contract',
    text: (p: SimParams) => {
      const euro = pctText(feeOf(p, 'euroFee'))
      const uc = pctText(feeOf(p, 'ucFee'))
      if (!hasUc(p)) return { fr: `Frais de gestion saisis : ${euro.fr} par an.`, en: `Management fees entered: ${euro.en} a year.` }
      if (!hasEuro(p)) return { fr: `Frais de gestion saisis : ${uc.fr} par an.`, en: `Management fees entered: ${uc.en} a year.` }
      return {
        fr: `Frais de gestion saisis : ${euro.fr} par an sur le fonds en euros, ${uc.fr} sur les unités de compte.`,
        en: `Management fees entered: ${euro.en} a year on the euro fund, ${uc.en} on unit-linked funds.`,
      }
    },
  },
  {
    nature: 'contract',
    text: {
      fr: 'Autres frais possibles, non simulés : arbitrage, frais propres aux fonds, garanties optionnelles.',
      en: 'Other possible fees, not simulated: switching, the funds\' own fees, optional guarantees.',
    },
  },
]
