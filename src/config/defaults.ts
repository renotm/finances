/**
 * Valeurs par défaut des placements (taux de marché, frais, hypothèses de l'utilisateur).
 *
 * Les paramètres fiscaux et réglementaires (barème, décote, prélèvements sociaux, plafonds, tables de rente)
 * sont centralisés et datés dans `fiscal.ts`.
 * Les pourcentages sont exprimés en % (1.7 = 1,7 %), les montants en euros.
 * Sources et date de vérification : voir SPEC.md (§4, §9) et FISCAL_RULES.md.
 */
import { fiscal } from './fiscal'

export const config = {
  /** Date de dernière vérification des valeurs, affichée en pied de page. */
  updatedAt: '2026-11-20',
  /** Date de dernière mise à jour de la page « Méthodologie et sources » (SPEC §5.6). */
  methodologyUpdatedAt: '2026-11-20',

  /** Paramètres d'épargne proposés à l'ouverture d'un placement. */
  simulation: {
    durationYears: 10,
    initialCapital: 1000,
    periodicAmount: 100,
  },

  /** Taux marginaux d'imposition proposés dans les listes (tranches du barème). */
  tmiOptions: fiscal.incomeTax.brackets.map((b) => b.rate),

  livretA: { rate: 1.7, cap: 22950 },
  ldds: { rate: 1.7, cap: 12000 },

  livretBancaire: {
    baseRate: 1.5,
    boostRate: 0,
    boostMonths: 0,
    boostCap: 0,
    cap: 0,
    tmi: 30,
    socialRate: fiscal.social.capital,
  },

  assuranceVie: {
    entryFee: 0,
    euroShare: 100,
    euroRate: 3.2,
    euroFee: 0.6,
    ucFee: 0.6,
    socialRate: fiscal.social.lifeInsurance,
  },

  per: {
    currentAge: 40,
    retirementAge: 64,
    tmiNow: 30,
    tmiRetirement: 11,
    entryFee: 0,
    euroShare: 100,
    euroRate: 3.2,
    euroFee: 0.6,
    ucFee: 0.6,
    capitalShare: 50,
    socialRate: fiscal.social.capital,
    /** Rente viagère (SPEC §4.4.1). */
    annuity: {
      /** Âge de fin de simulation par défaut (hypothèse de durée de vie) : moyenne H/F INSEE 2025 à 60 ans. */
      lifeExpectancy: 86,
      /** Hausse de l'espérance de vie, en années par décennie (tendance INSEE 2000-2025). */
      lifeGainPerDecade: 1,
      arrearsFee: 2,
      conversionRate: 3.5,
    },
  },

  /** Profils : âge de fin de simulation de la rente selon le sexe (INSEE 2025, arrondi ; SPEC §5.5). */
  endAgeBySex: { male: 85, female: 89 },

  /** Profils de risque des unités de compte : rendement moyen et écart pour la fourchette basse / haute. */
  riskProfiles: {
    prudent: { rate: 3, spread: 2 },
    balanced: { rate: 5, spread: 4 },
    dynamic: { rate: 7, spread: 6 },
  },

  /** Hypothèses de comparaison (SPEC §3.6) : inflation pour les euros constants et l'actualisation. */
  comparison: { inflationRate: 2 },
} as const

export type RiskProfile = keyof typeof config.riskProfiles
