/**
 * Références de la page « Méthodologie et sources » (SPEC §5.6). Chaque lien a été ouvert et vérifié à la date
 * indiquée. Les sources non institutionnelles sont marquées `secondary`.
 */
export interface Source {
  id: string
  title: string
  /** Libellé court, cité auprès des règles (ex. : « BOFiP, BOI-RPPM-RCM-20-15 »). */
  short: string
  /** Éditeur affiché (ex. : « impots.gouv.fr », « BOFiP »). */
  publisher: string
  url: string
  /** Règle appuyée par la source. */
  rule: string
  /** Date d'application de la règle. */
  appliesFrom: string
  /** Date de dernière vérification (AAAA-MM-JJ). */
  verifiedOn: string
  /** Source non institutionnelle (site spécialisé), affichée comme telle. */
  secondary?: boolean
}

const V = '2026-11-20'

export const SOURCES: Source[] = [
  // ---------- Impôt sur le revenu ----------
  {
    id: 'brochure-ir-2026',
    title: 'Brochure pratique de l\'impôt sur le revenu 2026, chapitre « Calcul de l\'impôt »',
    short: 'brochure IR 2026',
    publisher: 'impots.gouv.fr',
    url: 'https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/21-calcul_impot_369a382.pdf',
    rule: 'Barème des revenus 2025, plafonnement du quotient familial (1 807 € par demi-part, 4 262 € pour le parent isolé), décote (897 € / 1 483 €, 45,25 %)',
    appliesFrom: 'revenus 2025',
    verifiedOn: V,
  },
  {
    id: 'bofip-qf',
    title: 'BOI-IR-LIQ-20-20-20 : plafonnement des effets du quotient familial',
    short: 'BOFiP, BOI-IR-LIQ-20-20-20',
    publisher: 'BOFiP',
    url: 'https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407',
    rule: 'Plafond de 1 807 € par demi-part (§ 40) et de 4 262 € pour le parent isolé (§ 70)',
    appliesFrom: 'revenus 2025 (publication du 07/04/2026)',
    verifiedOn: V,
  },
  {
    id: 'impots-parent-isole',
    title: 'Je vis seul(e) avec des personnes à charge, quelles conséquences ?',
    short: 'impots.gouv.fr, parent isolé',
    publisher: 'impots.gouv.fr',
    url: 'https://www.impots.gouv.fr/particulier/questions/je-vis-seule-avec-des-personnes-charge-quelles-consequence',
    rule: 'Demi-part supplémentaire du parent isolé (case T), à condition de vivre seul',
    appliesFrom: 'en vigueur',
    verifiedOn: V,
  },
  {
    id: 'eco-decote',
    title: 'Pouvez-vous bénéficier de la décote de l\'impôt sur le revenu ?',
    short: 'economie.gouv.fr, décote',
    publisher: 'economie.gouv.fr',
    url: 'https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/pouvez-vous-beneficier-de-la-decote-de-limpot-sur-le-revenu',
    rule: 'Décote : 897 € (personne seule) ou 1 483 € (couple) moins 45,25 % de l\'impôt brut',
    appliesFrom: 'revenus 2025',
    verifiedOn: V,
  },
  {
    id: 'bofip-decote',
    title: 'BOI-IR-LIQ-20-20-30 : décote prévue au 4 du I de l\'article 197 du CGI',
    short: 'BOFiP, BOI-IR-LIQ-20-20-30',
    publisher: 'BOFiP',
    url: 'https://bofip.impots.gouv.fr/bofip/2495-PGP.html/identifiant=BOI-IR-LIQ-20-20-30-20260407',
    rule: 'Décote : montants et taux des revenus 2025',
    appliesFrom: 'revenus 2025 (publication du 07/04/2026)',
    verifiedOn: V,
  },
  {
    id: 'cgi-163-0-a',
    title: 'Code général des impôts, article 163-0 A',
    short: 'CGI, art. 163-0 A',
    publisher: 'Légifrance',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044978385',
    rule: 'Système du quotient : impôt du quart du revenu exceptionnel, multiplié par quatre',
    appliesFrom: '01/01/2022 (version en vigueur)',
    verifiedOn: V,
  },
  {
    id: 'sp-pensions',
    title: 'Impôt sur le revenu : déclarer les pensions de retraite',
    short: 'Service-Public, F415',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F415',
    rule: 'Abattement de 10 % sur les pensions : au moins 454 € par pensionné, au plus 4 439 € par foyer',
    appliesFrom: 'revenus 2025',
    verifiedOn: V,
  },
  // ---------- Prélèvements sociaux ----------
  {
    id: 'sp-csg',
    title: 'Prélèvements sociaux (CSG, CRDS…) sur les revenus du patrimoine et de placements',
    short: 'Service-Public, F2329',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2329',
    rule: 'Prélèvements sociaux de 18,6 % en 2026, 17,2 % pour l\'assurance vie ; CSG déductible de 6,8 % en cas d\'option pour le barème',
    appliesFrom: '01/01/2026',
    verifiedOn: V,
  },
  {
    id: 'sp-ps-2026',
    title: 'Plan d\'épargne retraite individuel : de nouvelles règles fiscales en 2026',
    short: 'Service-Public, A18841',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/actualites/A18841',
    rule: 'Prélèvements sociaux de 18,6 % sur toutes les sommes retirées d\'un PER depuis le 1er janvier 2026',
    appliesFrom: '01/01/2026',
    verifiedOn: V,
  },
  // ---------- Livrets ----------
  {
    id: 'sp-livret-a',
    title: 'Livret A',
    short: 'Service-Public, F2365',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2365',
    rule: 'Taux de 1,7 % du 01/08/2026 au 31/01/2027, plafond de 22 950 €, intérêts par quinzaines',
    appliesFrom: '01/08/2026',
    verifiedOn: V,
  },
  {
    id: 'sp-ldds',
    title: 'Livret de développement durable et solidaire (LDDS)',
    short: 'Service-Public, F2368',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2368',
    rule: 'Taux de 1,7 %, plafond de 12 000 €, intérêts par quinzaines',
    appliesFrom: '01/08/2026',
    verifiedOn: V,
  },
  {
    id: 'eco-livret-bancaire',
    title: 'Le livret d\'épargne bancaire : comment ça marche ?',
    short: 'economie.gouv.fr, livret bancaire',
    publisher: 'economie.gouv.fr',
    url: 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/le-livret-depargne-bancaire-comment-ca-marche',
    rule: 'Intérêts soumis au PFU de 31,4 % (12,8 % + 18,6 %) depuis le 1er janvier 2026, ou au barème sur option',
    appliesFrom: '01/01/2026',
    verifiedOn: V,
  },
  // ---------- Assurance vie ----------
  {
    id: 'legifrance-125-0-a',
    title: 'Code général des impôts, article 125-0 A',
    short: 'CGI, art. 125-0 A',
    publisher: 'Légifrance',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044989424',
    rule: 'Imposition des produits d\'assurance vie ; abattement de 4 600 € / 9 200 € imputé d\'abord sur les produits des primes antérieures au 27/09/2017, puis sur ceux taxés au taux réduit',
    appliesFrom: '01/01/2022 (version en vigueur)',
    verifiedOn: V,
  },
  {
    id: 'eco-av',
    title: 'Quelle est la fiscalité de l\'assurance-vie ?',
    short: 'economie.gouv.fr, assurance vie',
    publisher: 'economie.gouv.fr',
    url: 'https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/quelle-est-la-fiscalite-de-lassurance-vie',
    rule: 'Taux de 12,8 % / 7,5 %, seuil de 150 000 €, taux de 35 % / 15 % / 7,5 % des primes antérieures au 27/09/2017, abattement de 4 600 € / 9 200 €, prélèvements sociaux de 17,2 %',
    appliesFrom: 'en vigueur',
    verifiedOn: V,
  },
  {
    id: 'bofip-av-150k',
    title: 'BOI-RPPM-RCM-20-15 : modalités d\'imposition à l\'impôt sur le revenu des produits d\'assurance vie',
    short: 'BOFiP, BOI-RPPM-RCM-20-15',
    publisher: 'BOFiP',
    url: 'https://bofip.impots.gouv.fr/bofip/11224-PGP.html/identifiant=BOI-RPPM-RCM-20-15-20210621',
    rule: 'Seuil de 150 000 € de primes non remboursées, tous contrats, primes antérieures au 27/09/2017 comprises (§ 140 à 230)',
    appliesFrom: 'publication du 21/06/2021',
    verifiedOn: V,
  },
  {
    id: 'bofip-av-rachat',
    title: 'BOI-RPPM-RCM-20-10-20-50 : produits des bons ou contrats de capitalisation et d\'assurance vie',
    short: 'BOFiP, BOI-RPPM-RCM-20-10-20-50',
    publisher: 'BOFiP',
    url: 'https://bofip.impots.gouv.fr/bofip/3951-PGP.html',
    rule: 'Rachat partiel d\'un contrat en perte : part de primes remboursée plafonnée au montant racheté (§ 100, réponse RES n° 2010/46)',
    appliesFrom: 'publication du 30/06/2022',
    verifiedOn: V,
  },
  // ---------- PER ----------
  {
    id: 'sp-per',
    title: 'Plan d\'épargne retraite (PER)',
    short: 'Service-Public, F34982',
    publisher: 'Service-Public',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F34982',
    rule: 'Plafond de déduction (10 %, 4 710 € à 37 680 €), report des plafonds, fin de la déduction à 70 ans, fiscalité des sorties et des déblocages anticipés',
    appliesFrom: 'versements 2026',
    verifiedOn: V,
  },
  {
    id: 'impots-plafond-per',
    title: 'Que signifie la somme imprimée dans la rubrique « Plafond épargne retraite » de mon avis d\'impôt sur le revenu ?',
    short: 'impots.gouv.fr, plafond épargne retraite',
    publisher: 'impots.gouv.fr',
    url: 'https://www.impots.gouv.fr/particulier/questions/que-signifie-la-somme-imprimee-dans-la-rubrique-plafond-epargne-retraite-de',
    rule: 'Plafond de l\'année et plafonds non utilisés des années précédentes, indiqués sur l\'avis d\'impôt',
    appliesFrom: 'en vigueur',
    verifiedOn: V,
  },
  {
    id: 'bofip-per-sortie',
    title: 'BOI-RSA-PENS-30-10-20 : prestations de retraite servies sous forme de capital',
    short: 'BOFiP, BOI-RSA-PENS-30-10-20',
    publisher: 'BOFiP',
    url: 'https://bofip.impots.gouv.fr/bofip/7456-PGP.html/identifiant=BOI-RSA-PENS-30-10-20-20260217',
    rule: 'Capital issu de versements déduits : imposé comme une pension, sans abattement de 10 %, éligible au système du quotient',
    appliesFrom: 'publication du 17/02/2026',
    verifiedOn: V,
  },
  {
    id: 'cgi-158',
    title: 'Code général des impôts, article 158',
    short: 'CGI, art. 158 (6)',
    publisher: 'Légifrance',
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051765203',
    rule: 'Rentes viagères à titre onéreux : fraction imposable de 70 %, 50 %, 40 % ou 30 % selon l\'âge au premier versement',
    appliesFrom: '01/07/2026 (version en vigueur)',
    verifiedOn: V,
  },
  {
    id: 'tgf05',
    title: 'Rentes viagères : tarif au 1/1/26, table des rentes TGF05, taux technique 0 %',
    short: 'Guide de la taxe',
    publisher: 'Guide de la taxe (site spécialisé)',
    url: 'https://www.guide-de-la-taxe.fr/outils-pratiques/famille/rentes-viageres/',
    rule: 'Prix d\'un euro de rente viagère selon l\'âge (55 à 80 ans), utilisé pour estimer la rente du PER',
    appliesFrom: '01/01/2026',
    verifiedOn: V,
    secondary: true,
  },
]

export function sourceById(id: string): Source {
  const s = SOURCES.find((x) => x.id === id)
  if (!s) throw new Error(`Source inconnue : ${id}`)
  return s
}
