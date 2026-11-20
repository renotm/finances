/**
 * Paramètres fiscaux et réglementaires, datés et sourcés (détail et sources : FISCAL_RULES.md).
 *
 * À mettre à jour à chaque loi de finances et loi de financement de la sécurité sociale.
 * Les montants sont ceux applicables à l'imposition des revenus de `incomeYear` (déclarés l'année suivante).
 * Les pourcentages sont exprimés en % (12.8 = 12,8 %).
 */
export const fiscal = {
  /** Revenus auxquels s'appliquent le barème, la décote et les plafonds ci-dessous. */
  incomeYear: 2025,
  /** Date de dernière vérification des valeurs. */
  verifiedOn: '2026-11-20',

  /** Impôt sur le revenu (CGI art. 197). */
  incomeTax: {
    /** Barème par part, en euros. */
    brackets: [
      { upTo: 11600, rate: 0 },
      { upTo: 29579, rate: 11 },
      { upTo: 84577, rate: 30 },
      { upTo: 181917, rate: 41 },
      { upTo: Infinity, rate: 45 },
    ],
    /** Plafonnement du quotient familial : avantage maximal par demi-part au-delà des parts de base. */
    qfCapPerHalfPart: 1807,
    /** Plafond de la part accordée au parent isolé pour son premier enfant (case T), au lieu de 2 × 1 807 €. */
    qfCapSingleParent: 4262,
    /** Décote : forfait − taux × impôt brut, si positif. Forfait couple pour une imposition commune. */
    decote: { single: 897, couple: 1483, rate: 45.25 },
  },

  /** Abattement de 10 % sur les pensions et retraites (CGI art. 158-5 a). */
  pensionAllowance: { rate: 10, minPerPensioner: 454, maxPerHousehold: 4439 },

  /** Système du quotient pour les revenus exceptionnels (CGI art. 163-0 A) : coefficient appliqué. */
  quotientSystemCoefficient: 4,

  /** Prélèvement forfaitaire unique : part impôt sur le revenu. */
  pfuIncomeTax: 12.8,

  /** Prélèvements sociaux (LFSS 2026). */
  social: {
    /** Revenus du capital, dont livrets bancaires et sorties de PER, depuis le 1er janvier 2026. */
    capital: 18.6,
    /** Assurance vie et contrats de capitalisation, exclus de la hausse de 2026. */
    lifeInsurance: 17.2,
    /** CSG déductible du revenu imposable en cas d'option pour le barème. */
    deductibleCsg: 6.8,
  },

  /** Plan d'épargne retraite. */
  per: {
    /** Plafond de déduction des salariés : 10 % des revenus professionnels, plancher et maximum (PASS 2025). */
    ceilingRate: 10,
    ceilingFloor: 4710,
    ceilingMax: 37680,
    /** Report des plafonds non utilisés : 3 ans pour ceux nés avant 2026, 5 ans ensuite (LF 2026 art. 10). */
    carryRuleChangeYear: 2026,
    carryYearsBefore: 3,
    carryYearsAfter: 5,
    /** Versements non déductibles si le titulaire a atteint cet âge, à compter de 2026 (LF 2026 art. 9). */
    deductionAgeLimit: 70,
    deductionAgeLimitFromYear: 2026,
    /** Fraction imposable des rentes viagères à titre onéreux selon l'âge à l'entrée en jouissance (CGI art. 158-6). */
    annuityTaxableFractions: [
      { maxAge: 49, fraction: 70 },
      { maxAge: 59, fraction: 50 },
      { maxAge: 69, fraction: 40 },
      { maxAge: Infinity, fraction: 30 },
    ],
  },

  /** Assurance vie (CGI art. 125-0 A, 990 I exclu). */
  lifeInsurance: {
    /** Primes versées à partir de cette date : régime du PFU. Avant : PFL de 35 % / 15 % / 7,5 % selon la durée. */
    reformDate: '2017-09',
    allowanceSingle: 4600,
    allowanceCouple: 9200,
    reducedRate: 7.5,
    /** Seuil de primes nettes, par assuré, tous contrats, au 31 décembre de l'année précédant le rachat. */
    premiumsThreshold: 150000,
    yearsForReducedRate: 8,
    /** Primes versées avant le 27/09/2017 : prélèvement forfaitaire libératoire selon la durée du contrat. */
    pre2017Rates: { under4Years: 35, from4To8Years: 15, after8Years: 7.5 },
  },

  /**
   * Prix d'un euro de rente viagère annuelle, table TGF05 à taux technique 0 %, selon l'âge à la liquidation.
   * Source : Guide de la taxe, « Tarif 1/1/26 – Table des rentes TGF05 – taux technique 0 % ».
   * Rente annuelle = capital converti ÷ prix.
   */
  tgf05AnnuityPrices: {
    tariffDate: '2026-01-01',
    technicalRate: 0,
    byAge: {
      55: 41.9459, 56: 40.8032, 57: 39.6665, 58: 38.5349, 59: 37.4051,
      60: 36.2784, 61: 35.1524, 62: 34.0266, 63: 32.9004, 64: 31.7745,
      65: 30.6543, 66: 29.5385, 67: 28.429, 68: 27.3257, 69: 26.229,
      70: 25.1391, 71: 24.0594, 72: 22.9889, 73: 21.9263, 74: 20.8778,
      75: 19.8417, 76: 18.8208, 77: 17.8154, 78: 16.8294, 79: 15.8609,
      80: 14.9136,
    } as Record<number, number>,
  },

  /** Enfants à charge : âges limites au 1er janvier de l'année des revenus (CGI art. 196 et 196 B). */
  children: { minorAgeLimit: 18, attachedAgeLimit: { '21': 21, '25': 25 } },
} as const
