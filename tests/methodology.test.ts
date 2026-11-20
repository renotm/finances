/**
 * Exemples de la page « Méthodologie et sources » (SPEC §5.6) : chaque valeur affichée, calculée par le moteur,
 * est comparée à un calcul fait à la main à partir des règles de FISCAL_RULES.md.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { renderToString } from 'vue/server-renderer'
import en from '../src/i18n/en'
import fr from '../src/i18n/fr'
import { methodologyExamples } from '../src/methodology/examples'
import { SOURCES } from '../src/methodology/sources'
import MethodologyPage from '../src/ui/methodology/MethodologyPage.vue'

const ex = methodologyExamples()

describe('Méthodologie : exemples d\'impôt sur le revenu', () => {
  it('barème : célibataire, 40 000 €', () => {
    // (29 579 − 11 600) × 11 % + (40 000 − 29 579) × 30 % = 1 977,69 + 3 126,30 ; décote nulle
    expect(ex.tax40k.tax).toBeCloseTo(5103.99, 2)
    expect(ex.tax40k.bracketRate).toBe(30)
  })

  it('quotient familial plafonné : couple, deux enfants, 80 000 €', () => {
    // 2 parts : 2 × 5 103,99 = 10 207,98 ; 3 parts : 3 × (26 666,67 − 11 600) × 11 % = 4 972 ;
    // avantage 5 235,98 > 2 × 1 807 = 3 614 → impôt 10 207,98 − 3 614 = 6 593,98
    expect(ex.qf.base.tax).toBeCloseTo(10207.98, 2)
    expect(ex.qf.uncapped).toBeCloseTo(4972, 2)
    expect(ex.qf.result.capped).toBe(true)
    expect(ex.qf.result.tax).toBeCloseTo(6593.98, 2)
  })

  it('décote : célibataire, 20 000 €', () => {
    // impôt brut 8 400 × 11 % = 924 ; décote 897 − 45,25 % × 924 = 478,89
    expect(ex.decote.grossTax).toBeCloseTo(924, 2)
    expect(ex.decote.decote).toBeCloseTo(478.89, 2)
    expect(ex.decote.tax).toBeCloseTo(445.11, 2)
  })

  it('économie d\'un versement PER qui fait changer de tranche', () => {
    // impôt(32 000) = 2 703,99 ; impôt(27 290) = 1 725,90 − décote (897 − 780,97 = 116,03) = 1 609,87
    expect(ex.savingBracket.saving).toBeCloseTo(1094.12, 2)
    expect(ex.savingBracket.naive).toBeCloseTo(1413, 2)
  })

  it('économie d\'un versement PER amplifiée par la décote', () => {
    // impôt(22 000) = 1 144 − 379,34 = 764,66 ; impôt(18 000) = 704 − 578,44 = 125,56
    expect(ex.savingDecote.saving).toBeCloseTo(639.1, 2)
    expect(ex.savingDecote.naive).toBeCloseTo(440, 2)
  })

  it('système du quotient : 40 000 € de capital PER, revenu 25 000 €', () => {
    // impôt(25 000) = 1 474 − 230,02 = 1 243,99 ; impôt(65 000) = 12 603,99 ; impôt(35 000) = 3 603,99
    expect(ex.quotient.direct).toBeCloseTo(12603.99 - 1243.985, 2)
    expect(ex.quotient.withQuotient).toBeCloseTo(4 * (3603.99 - 1243.985), 2)
    expect(ex.quotient.tax).toBeCloseTo(9440.02, 2)
  })
})

describe('Méthodologie : exemples des placements', () => {
  it('plafond PER : 10 % des revenus, entre 4 710 € et 37 680 €', () => {
    expect(ex.ceilings.map((c) => c.ceiling)).toEqual([4710, 6000, 37680])
  })

  it('rente : 100 000 € à 64 ans', () => {
    // 100 000 ÷ 31,7745 × 98 %
    expect(ex.annuity.price).toBe(31.7745)
    expect(ex.annuity.gross).toBeCloseTo((100000 / 31.7745) * 0.98, 6)
    expect(ex.annuity.rvtoFraction).toBe(0.4)
  })

  it('abattement sur les pensions : plancher par pensionné', () => {
    expect(ex.pensions.allowance).toBe(454 + 2000)
    expect(ex.pensions.annuityTaxable).toBeCloseTo(2000, 9)
  })

  it('Livret A : 1 000 € versés en mars rapportent à partir du 16 mars (19 quinzaines)', () => {
    expect(ex.livretA.interest).toBeCloseTo(Math.round(1000 * 0.017 * (19 / 24) * 100) / 100, 9)
  })

  it('livret bancaire au PFU : 10 000 € à 1,5 % pendant un an', () => {
    // 150 € d'intérêts ; 27,90 € de prélèvements sociaux (18,6 %) et 19,20 € d'acompte (12,8 %) retenus
    expect(ex.bancaire.interest).toBeCloseTo(150, 9)
    expect(ex.bancaire.withheld).toBeCloseTo(47.1, 9)
    expect(ex.bancaire.finalGross).toBeCloseTo(10102.9, 9)
  })

  it('assurance vie : rachat de 10 000 € sur 50 000 € (40 000 € de primes)', () => {
    // produits 10 000 − 40 000 × 20 % = 2 000 €
    expect(ex.av.gains).toBeCloseTo(2000, 9)
    expect(ex.av.before8.incomeTax).toBeCloseTo(256, 9)
    expect(ex.av.before8.social).toBeCloseTo(344, 9)
    expect(ex.av.after8.incomeTax).toBe(0)
    expect(ex.av.after8.social).toBeCloseTo(344, 9)
  })
})

describe('Méthodologie : indicateurs de comparaison', () => {
  it('TRI, rendement réel et valeur actualisée', () => {
    expect(ex.irr).toBeCloseTo(0.1, 9)
    expect(ex.real).toBeCloseTo(1.03 / 1.02 - 1, 12)
    expect(ex.pv).toBeCloseTo(1000 / 1.02 ** 10, 9)
  })
})

describe('Méthodologie : rendu de la page', () => {
  const render = async (locale: 'fr' | 'en') => {
    const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'fr', messages: { fr, en } })
    const app = createSSRApp({ render: () => h(MethodologyPage, { section: '' }) })
    app.use(i18n)
    return renderToString(app)
  }
  const eur2 = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

  it('affiche les huit sections, chacune atteignable depuis le sommaire', async () => {
    const html = await render('fr')
    for (const id of ['principes', 'placements', 'livrets', 'livret-bancaire', 'assurance-vie', 'per', 'fiscalite', 'comparaison', 'limites', 'sources', 'fiabilite', 'avertissement']) {
      expect(html, id).toContain(`id="m-${id}"`)
      expect(html, id).toContain(`href="#/methodologie/${id}"`)
    }
  })

  it('affiche les exemples calculés par le moteur, sans valeur indéfinie', async () => {
    const html = await render('fr')
    for (const v of [ex.tax40k.tax, ex.qf.result.tax, ex.decote.tax, ex.savingBracket.saving, ex.savingDecote.saving, ex.quotient.tax, ex.annuity.gross, ex.livretA.interest, ex.bancaire.finalGross]) {
      expect(html).toContain(eur2(v))
    }
    expect(html).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('cite chaque source auprès d\'au moins une règle et dans le tableau', async () => {
    const html = await render('fr')
    for (const s of SOURCES) {
      const occurrences = html.split(`href="${s.url.replace(/&/g, '&amp;')}"`).length - 1
      expect(occurrences, s.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('ne revendique aucune certification et ne présente pas les tests comme une garantie', async () => {
    const html = await render('fr')
    expect(html).toContain('ne garantissent pas')
    expect(html).toContain('aucune certification')
  })

  it('en anglais : contenu en français, précédé d\'une note', async () => {
    const html = await render('en')
    expect(html).toContain(en.methodology.frenchOnly.replace(/'/g, '&#39;'))
    expect(html).toContain('id="m-fiscalite"')
  })
})

describe('Méthodologie : sources', () => {
  const allowed = /^https:\/\/(www\.)?(impots\.gouv\.fr|bofip\.impots\.gouv\.fr|legifrance\.gouv\.fr|service-public\.(gouv\.)?fr|economie\.gouv\.fr|amf-france\.org|banque-france\.fr|insee\.fr)\//

  it('identifiants uniques, champs renseignés', () => {
    const ids = SOURCES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SOURCES) {
      expect(s.title, s.id).not.toBe('')
      expect(s.rule, s.id).not.toBe('')
      expect(s.appliesFrom, s.id).not.toBe('')
      expect(s.verifiedOn, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('les sources institutionnelles sont sur les domaines autorisés ; les autres sont marquées secondaires', () => {
    for (const s of SOURCES) {
      if (s.secondary) expect(s.url, s.id).toMatch(/^https:\/\//)
      else expect(s.url, s.id).toMatch(allowed)
    }
  })
})
