/**
 * Valeurs par défaut du simulateur.
 *
 * C'est le seul fichier à modifier quand les taux ou les barèmes changent
 * (Livret A : révisions au 1er février et au 1er août).
 * Les pourcentages sont exprimés en % (1.7 = 1,7 %), les montants en euros.
 * Sources et date de vérification : voir SPEC.md, §4 et §9.
 */
export const config = {
  /** Date de dernière vérification des valeurs, affichée en pied de page. */
  updatedAt: '2026-11-20',

  /** Paramètres d'épargne proposés à l'ouverture d'un placement. */
  simulation: {
    durationYears: 10,
    initialCapital: 1000,
    periodicAmount: 100,
  },

  /** Taux marginaux d'imposition proposés dans les listes. */
  tmiOptions: [0, 11, 30, 41, 45],

  /** Part impôt sur le revenu de la flat tax (PFU). */
  pfuIncomeTax: 12.8,

  livretA: { rate: 1.7, cap: 22950 },
  ldds: { rate: 1.7, cap: 12000 },

  livretBancaire: {
    baseRate: 1.5,
    boostRate: 0,
    boostMonths: 0,
    boostCap: 0,
    cap: 0,
    tmi: 30,
    socialRate: 18.6,
  },

  assuranceVie: {
    entryFee: 0,
    euroShare: 100,
    euroRate: 3.2,
    euroFee: 0.6,
    ucFee: 0.6,
    socialRate: 17.2,
    allowanceSingle: 4600,
    allowanceCouple: 9200,
    reducedRate: 7.5,
    premiumsThreshold: 150000,
    yearsForReducedRate: 8,
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
    socialRate: 18.6,
    /** Rente viagère (SPEC §4.4.1). */
    annuity: {
      /** Espérance de vie actuelle (âge) d'une personne arrivée à la retraite : moyenne H/F INSEE 2025. */
      lifeExpectancy: 86,
      /** Hausse de l'espérance de vie, en années par décennie (tendance INSEE 2000-2025). */
      lifeGainPerDecade: 1,
      technicalRate: 0.5,
      arrearsFee: 2,
      conversionRate: 3.5,
    },
    /** Plafond de déduction salarié : 10 % des revenus, borné (valeurs 2026, PASS 2025). */
    ceilingRate: 10,
    ceilingFloor: 4710,
    ceilingMax: 37680,
    /** Abattement de 10 % des pensions, appliqué à la rente issue de versements déduits. */
    pensionAllowance: 10,
    /** Fraction imposable des rentes viagères à titre onéreux selon l'âge au premier versement. */
    annuityTaxableFractions: [
      { maxAge: 49, fraction: 70 },
      { maxAge: 59, fraction: 50 },
      { maxAge: 69, fraction: 40 },
      { maxAge: Infinity, fraction: 30 },
    ],
  },

  /** Profils de risque des unités de compte : rendement moyen et écart pour la fourchette basse / haute. */
  riskProfiles: {
    prudent: { rate: 3, spread: 2 },
    balanced: { rate: 5, spread: 4 },
    dynamic: { rate: 7, spread: 6 },
  },

  /** Réservé pour la v2 (euros constants). */
  inflation: { rate: 2 },
} as const

export type RiskProfile = keyof typeof config.riskProfiles
