/**
 * Données partagées par les sections de la méthodologie : paramètres du moteur, exemples calculés, formats.
 * La page est rédigée en français : les nombres sont formatés en fr-FR quelle que soit la langue de l'interface.
 */
import { version } from '../../../package.json'
import { config } from '../../config/defaults'
import { fiscal } from '../../config/fiscal'
import { methodologyExamples } from '../../methodology/examples'

export { config, fiscal }
export const ex = methodologyExamples()
export const appVersion = version

const eur0Fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2Fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 })
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

/** Montant arrondi à l'euro. */
export const eur = (v: number) => eur0Fmt.format(v)
/** Montant au centime. */
export const eur2 = (v: number) => eur2Fmt.format(v)
/** Nombre en notation française (virgule décimale). */
export const num = (v: number) => numFmt.format(v)
/** Taux exprimé en % dans la config (12.8 → « 12,8 % »). */
export const pct = (v: number) => `${numFmt.format(v)} %`
/** Taux exprimé en fraction (0.098 → « 0,98 % »), avec `digits` décimales. */
export const pctOf = (v: number, digits = 2) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v * 100)} %`
/** Date AAAA-MM-JJ en toutes lettres. */
export const date = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return dateFmt.format(new Date(y, m - 1, d))
}

/** Espaces insécables dans un texte saisi : séparateurs de milliers, avant € et %, pour éviter « 4 | 262 € ». */
export const nbsp = (s: string) =>
  s.replace(/(\d) (?=\d{3}\b)/g, '$1 ').replace(/(\d) (?=[€%])/g, '$1 ')

/** Tranches du barème avec leur borne basse, pour l'affichage. */
export const brackets = fiscal.incomeTax.brackets.map((b, i, all) => ({
  from: i === 0 ? 0 : all[i - 1].upTo,
  upTo: b.upTo,
  rate: b.rate,
}))
