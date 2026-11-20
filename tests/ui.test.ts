/**
 * Cohérence entre le moteur et l'affichage (phase 6) : les montants des cartes de synthèse, du tableau détaillé
 * et des séries du graphique sont exactement ceux calculés par le moteur.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { renderToString } from 'vue/server-renderer'
import { runSimulation } from '../src/engine/run'
import en from '../src/i18n/en'
import fr from '../src/i18n/fr'
import { chartSeries } from '../src/ui/chartData'
import { comparisonDiffs } from '../src/ui/comparison'
import DetailTables from '../src/ui/components/DetailTables.vue'
import SummaryCards from '../src/ui/components/SummaryCards.vue'
import { params } from './helpers'

const eur = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.abs(v) < 0.5 ? 0 : v)

async function render(component: object, props: Record<string, unknown>) {
  const i18n = createI18n({ legacy: false, locale: 'fr', fallbackLocale: 'fr', messages: { fr, en } })
  const app = createSSRApp({ render: () => h(component, props) })
  app.use(i18n)
  return renderToString(app)
}

const items = () =>
  [
    { id: 1, productId: 'livretA', params: params('livretA', { initialCapital: 1000, periodicAmount: 100, durationYears: 5 }) },
    { id: 2, productId: 'assuranceVie', params: params('assuranceVie', { initialCapital: 1000, periodicAmount: 100, durationYears: 5, euroShare: 70, ucRate: 5 }) },
    { id: 3, productId: 'per', params: params('per', { currentAge: 60, retirementAge: 64, initialCapital: 1000, periodicAmount: 100, exitMode: 'mixed' }) },
  ].map((slot) => ({ slot, run: runSimulation(slot.productId, slot.params) }))

describe('cartes de synthèse', () => {
  it('affichent les valeurs finales, versements, gains et la rente du moteur', async () => {
    const list = items()
    const html = await render(SummaryCards, { items: list, view: 'net', inflation: 0.02 })
    for (const { run } of list) {
      const s = run.result.summary
      expect(html).toContain(eur(s.finalNet))
      expect(html).toContain(eur(s.finalGross))
      expect(html).toContain(eur(s.totalDeposited))
      expect(html).toContain(eur(s.gains))
    }
    const annuity = list[2].run.result.annuity!
    expect(html).toContain(eur(annuity.netYearly / 12))
    expect(html).toContain(eur(annuity.capitalAlternativeNet))
  })

  it('en vue brute, la valeur principale est la valeur brute', async () => {
    const list = items()
    const html = await render(SummaryCards, { items: list, view: 'gross', inflation: 0.02 })
    const first = html.indexOf('card__value')
    expect(html.slice(first, first + 200)).toContain(eur(list[0].run.result.summary.finalGross))
  })
})

describe('tableau détaillé', () => {
  it('chaque ligne reprend les valeurs annuelles du moteur', async () => {
    const list = items()
    const html = await render(DetailTables, { items: list })
    for (const y of list[0].run.result.years) {
      expect(html).toContain(`>${y.year}<`)
      expect(html).toContain(eur(y.endValue))
      expect(html).toContain(eur(y.gains))
    }
  })
})

describe('graphique', () => {
  it('les séries reprennent exactement les points du moteur, brut ou net', () => {
    const list = items()
    const runs = list.map((x) => x.run)
    for (const view of ['gross', 'net'] as const) {
      const series = chartSeries(runs, view)
      for (const [idx, run] of runs.entries()) {
        const main = series.find((s) => s.slot === idx && s.kind === 'main')!
        expect(main.data.map((d) => d.y)).toEqual(run.result.points.map((p) => (view === 'net' ? p.net : p.gross)))
        expect(main.data.map((d) => d.x)).toEqual(run.result.points.map((p) => p.t))
      }
    }
  })

  it('fourchette affichée seulement pour les supports risqués', () => {
    const series = chartSeries(items().map((x) => x.run), 'net')
    expect(series.filter((s) => s.kind !== 'main').map((s) => s.slot)).toEqual([1, 1])
  })
})

describe('notes de comparaison', () => {
  it('effort et horizon identiques : pas de note', () => {
    const a = runSimulation('livretA', params('livretA', { initialCapital: 1000, periodicAmount: 100, durationYears: 5 }))
    const b = runSimulation('ldds', params('ldds', { initialCapital: 1000, periodicAmount: 100, durationYears: 5 }))
    const d = comparisonDiffs([a, b])
    expect(d.effortDiffers).toBe(false)
    expect(d.horizonDiffers).toBe(false)
  })

  it('efforts et horizons différents : signalés', () => {
    const d = comparisonDiffs(items().map((x) => x.run))
    expect(d.horizonDiffers).toBe(true)
    expect(d.effortDiffers).toBe(true)
  })
})
