import { createI18n } from 'vue-i18n'
import en from './en'
import fr from './fr'

export type Locale = 'fr' | 'en'
const STORAGE_KEY = 'simulateur.locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    // stockage indisponible (navigation privée…) : on ignore
  }
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'fr',
  messages: { fr, en },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignoré
  }
}
