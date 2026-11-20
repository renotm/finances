/**
 * Comparaison qualitative des placements (SPEC §5.7) : structure des données, variantes selon les paramètres de la
 * colonne, rendu des blocs repliés et synchronisés.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { renderToString } from 'vue/server-renderer'
import { products } from '../src/engine/registry'
import { runSimulation } from '../src/engine/run'
import en from '../src/i18n/en'
import fr from '../src/i18n/fr'
import { SOURCES } from '../src/methodology/sources'
import { QUALITATIVE, resolveQualitative } from '../src/qualitative'
import { CATEGORIES } from '../src/qualitative/types'
import SummaryCards from '../src/ui/components/SummaryCards.vue'
import { params } from './helpers'

const texts = (productId: string, overrides: Record<string, unknown> = {}, locale: 'fr' | 'en' = 'fr') =>
  resolveQualitative(productId, params(productId, overrides), locale)
const category = (productId: string, id: string, overrides: Record<string, unknown> = {}) =>
  texts(productId, overrides).find((c) => c.id === id)!.items.map((i) => i.text).join(' | ')

describe('données qualitatives', () => {
  it('chaque placement du simulateur a ses caractéristiques, dans les 7 catégories communes', () => {
    expect(QUALITATIVE.map((q) => q.productId).sort()).toEqual(products.map((p) => p.id).sort())
    for (const q of QUALITATIVE) expect(Object.keys(q.categories).sort(), q.productId).toEqual([...CATEGORIES].sort())
  })

  it('chaque élément a un texte FR et EN non vide, une nature et des sources existantes', () => {
    const ids = new Set(SOURCES.map((s) => s.id))
    const variants = [{}, { euroShare: 40, household: 'couple', exitMode: 'annuity', deducted: false, taxMode: 'bareme', boostRate: 3, entryFee: 2 }]
    for (const q of QUALITATIVE) {
      for (const v of variants) {
        const p = params(q.productId, v)
        for (const cat of Object.values(q.categories)) {
          for (const item of cat.items) {
            if (item.when && !item.when(p)) continue
            const t = typeof item.text === 'function' ? item.text(p) : item.text
            expect(t.fr.trim(), q.productId).not.toBe('')
            expect(t.en.trim(), q.productId).not.toBe('')
            expect(['legal', 'practice', 'contract']).toContain(item.nature)
            for (const s of item.sources ?? []) expect(ids.has(s), `${q.productId} : ${s}`).toBe(true)
          }
        }
      }
    }
  })

  it('catégories non vides, sauf la rente viagère, sans objet hors PER', () => {
    for (const q of QUALITATIVE) {
      for (const cat of texts(q.productId)) {
        if (cat.id === 'annuity' && q.productId !== 'per') expect(cat.notApplicable, q.productId).toBe(true)
        else expect(cat.items.length, `${q.productId} : ${cat.id}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('règles distinguées', () => {
  it('assurance vie : âge au versement ; PER assurance : âge au décès, gains compris après 70 ans', () => {
    expect(category('assuranceVie', 'transmission')).toContain('au moment de chaque versement')
    expect(category('assuranceVie', 'transmission')).toContain('les gains sont exonérés')
    expect(category('per', 'transmission')).toContain('âge du titulaire au décès')
    expect(category('per', 'transmission')).toContain('gains compris')
  })

  it('garanties : État pour les livrets réglementés, FGDR pour les dépôts bancaires, FGAP pour l\'assurance', () => {
    expect(category('livretA', 'risks')).toContain('Garantie de l\'État')
    expect(category('livretBancaire', 'risks')).toContain('FGDR')
    expect(category('livretBancaire', 'risks')).not.toContain('Garantie de l\'État')
    expect(category('assuranceVie', 'risks')).toContain('FGAP')
  })

  it('le conjoint n\'est jamais supposé bénéficiaire', () => {
    const couple = category('assuranceVie', 'transmission', { household: 'couple' })
    expect(couple).toContain('s\'il est désigné bénéficiaire')
    expect(category('assuranceVie', 'transmission')).not.toContain('conjoint')
  })

  it('le délai de six mois n\'est pas présenté comme une durée de blocage', () => {
    const after = texts('livretA').find((c) => c.id === 'afterDeath')!
    const six = after.items.find((i) => i.text.includes('six mois'))!
    expect(six.nature).toBe('practice')
    expect(six.text).toContain('pas celui du déblocage')
  })
})

describe('adaptation aux paramètres de la colonne', () => {
  it('assurance vie : unités de compte et fonds en euros selon la répartition', () => {
    expect(category('assuranceVie', 'risks', { euroShare: 100 })).not.toContain('Unités de compte')
    expect(category('assuranceVie', 'risks', { euroShare: 70 })).toContain('Unités de compte (30 %')
    expect(category('assuranceVie', 'risks', { euroShare: 0 })).not.toContain('Fonds en euros')
  })

  it('frais saisis cités', () => {
    expect(category('assuranceVie', 'fees', { entryFee: 2 })).toContain('Frais sur versements saisis : 2 %')
    expect(category('assuranceVie', 'fees', { entryFee: 0 })).toContain('Aucun frais sur versements saisi')
  })

  it('PER : déduction et mode de sortie', () => {
    expect(category('per', 'tax', { deducted: true })).toContain('Versements déduits')
    expect(category('per', 'tax', { deducted: false })).toContain('Versements non déduits')
    expect(category('per', 'tax', { exitMode: 'annuity' })).toContain('Sortie en rente prévue')
    expect(category('per', 'annuity', { exitMode: 'capital' })).toContain('Sortie en capital prévue')
    expect(category('per', 'annuity', { exitMode: 'annuity' })).not.toContain('Sortie en capital prévue')
    expect(category('per', 'fees', { exitMode: 'annuity', arrearsFee: 3 })).toContain('arrérages de la rente saisis : 3 %')
  })

  it('livret bancaire : PFU ou barème', () => {
    expect(category('livretBancaire', 'tax', { taxMode: 'flat' })).toContain('prélèvement forfaitaire unique')
    expect(category('livretBancaire', 'tax', { taxMode: 'bareme' })).toContain('Option pour le barème')
  })

  it('situation familiale lue dans la colonne (contexte fiscal de la colonne), pas dans le profil actif', () => {
    const married = { situation: 'married', children: [], livesAlone: true, income: 50000, retirementIncome: null, retirementPensions: null }
    expect(category('livretA', 'transmission', { taxContext: married })).toContain('partenaire de PACS')
    expect(category('livretA', 'transmission', { taxContext: null })).not.toContain('partenaire de PACS')
  })

  it('anglais', () => {
    const cats = texts('per', {}, 'en')
    expect(cats.find((c) => c.id === 'availability')!.items[0].text).toBe('Savings are locked until retirement.')
  })
})

describe('affichage sous les cartes', () => {
  const items = () =>
    ['livretA', 'assuranceVie', 'per'].map((productId, i) => {
      const p = params(productId, { initialCapital: 1000, durationYears: 2, currentAge: 62, retirementAge: 64 })
      return { slot: { id: i + 1, productId, params: p }, run: runSimulation(productId, p) }
    })
  const render = async (locale: 'fr' | 'en' = 'fr') => {
    const i18n = createI18n({ legacy: false, locale, fallbackLocale: 'fr', messages: { fr, en } })
    const app = createSSRApp({ render: () => h(SummaryCards, { items: items(), view: 'net', inflation: 0.02 }) })
    app.use(i18n)
    return renderToString(app)
  }

  it('un bouton par colonne, replié par défaut, sans contenu rendu', async () => {
    const html = await render()
    expect(html.split('class="qual__toggle"').length - 1).toBe(3)
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('class="qual__cat"')
    expect(html).toContain(fr.qualitative.title)
  })

  it('libellé traduit en anglais', async () => {
    expect(await render('en')).toContain(en.qualitative.title)
  })
})
