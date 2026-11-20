<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MethodComparison from './MethodComparison.vue'
import MethodLimits from './MethodLimits.vue'
import MethodPrinciples from './MethodPrinciples.vue'
import MethodProducts from './MethodProducts.vue'
import MethodReliability from './MethodReliability.vue'
import MethodSources from './MethodSources.vue'
import MethodTax from './MethodTax.vue'
import { appVersion, config, date, fiscal } from './data'

/** Section visée par l'URL (`#/methodologie/<section>`), vide pour le haut de la page. */
const props = defineProps<{ section: string }>()
const { t, locale } = useI18n()

const toc = [
  { id: 'principes', label: 'Principes' },
  {
    id: 'placements',
    label: 'Fonctionnement des placements',
    children: [
      { id: 'livrets', label: 'Livret A et LDDS' },
      { id: 'livret-bancaire', label: 'Livret bancaire' },
      { id: 'assurance-vie', label: 'Assurance vie' },
      { id: 'per', label: 'PER' },
    ],
  },
  { id: 'fiscalite', label: 'Fiscalité' },
  { id: 'comparaison', label: 'Méthodes de comparaison' },
  { id: 'limites', label: 'Limites et approximations' },
  { id: 'sources', label: 'Sources et références' },
  { id: 'fiabilite', label: 'Fiabilité et validation' },
  { id: 'avertissement', label: 'Avertissement' },
]

/** Fait défiler jusqu'à la section de l'URL (lien direct ou clic dans la table des matières). */
async function scrollToSection() {
  await nextTick()
  if (!props.section) return
  document.getElementById(`m-${props.section}`)?.scrollIntoView({ block: 'start' })
}
onMounted(scrollToSection)
watch(() => props.section, scrollToSection)
</script>

<template>
  <div class="method">
    <header class="method__head">
      <h2 class="method__title">{{ t('methodology.title') }}</h2>
      <p v-if="locale !== 'fr'" class="method__lang-note" lang="en">{{ t('methodology.frenchOnly') }}</p>
      <p class="method__lead" lang="fr">
        Comment le simulateur calcule, sur quelles règles et avec quelles limites. Règles fiscales des revenus {{ fiscal.incomeYear }},
        vérifiées le {{ date(fiscal.verifiedOn) }}. Version {{ appVersion }}, méthodologie mise à jour le {{ date(config.methodologyUpdatedAt) }}.
      </p>
    </header>

    <div class="method__layout" lang="fr">
      <nav class="method__toc" aria-label="Table des matières">
        <p class="method__toc-title">Sommaire</p>
        <ol>
          <li v-for="s in toc" :key="s.id">
            <a :href="`#/methodologie/${s.id}`" :aria-current="props.section === s.id ? 'location' : undefined">{{ s.label }}</a>
            <ol v-if="s.children">
              <li v-for="c in s.children" :key="c.id">
                <a :href="`#/methodologie/${c.id}`" :aria-current="props.section === c.id ? 'location' : undefined">{{ c.label }}</a>
              </li>
            </ol>
          </li>
        </ol>
      </nav>

      <article class="method__body">
        <MethodPrinciples />
        <MethodProducts />
        <MethodTax />
        <MethodComparison />
        <MethodLimits />
        <MethodSources />
        <MethodReliability />

        <section id="m-avertissement" class="method__section">
          <h2>8. Avertissement</h2>
          <p>
            Ce simulateur est un outil pédagogique d'aide à la décision. Ses résultats dépendent d'hypothèses et de règles simplifiées ; ils
            ne constituent ni une prévision, ni une garantie, ni un conseil en investissement. Ils ne remplacent pas un conseil financier ou
            fiscal personnalisé, qui tient compte de l'ensemble de votre situation. Avant toute décision, vérifiez les conditions de votre
            contrat et votre situation fiscale auprès des organismes concernés.
          </p>
        </section>
      </article>
    </div>
  </div>
</template>
