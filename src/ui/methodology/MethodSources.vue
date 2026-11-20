<script setup lang="ts">
import { SOURCES } from '../../methodology/sources'
import { date, nbsp } from './data'

const institutional = SOURCES.filter((s) => !s.secondary)
const secondary = SOURCES.filter((s) => s.secondary)
</script>

<template>
  <section id="m-sources" class="method__section">
    <h2>6. Sources et références</h2>
    <p>
      Chaque règle fiscale ou réglementaire importante est rattachée à une source, citée auprès de la règle et reprise ci-dessous. Chaque
      lien a été ouvert et son contenu comparé à la règle à la date de vérification indiquée. Les textes évoluent : une source peut avoir
      été mise à jour depuis.
    </p>

    <h3>Sources institutionnelles</h3>
    <div class="table-wrap">
      <table class="method__table method__sources">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Règle concernée</th>
            <th scope="col">Application</th>
            <th scope="col">Vérifiée le</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in institutional" :key="s.id">
            <th scope="row">
              <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.title }}</a>
              <span class="method__publisher">{{ s.publisher }}</span>
            </th>
            <td>{{ nbsp(s.rule) }}</td>
            <td>{{ s.appliesFrom }}</td>
            <td>{{ date(s.verifiedOn) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Sources secondaires</h3>
    <p>
      Faute de publication institutionnelle trouvée, ces données viennent d'un site spécialisé. Elles sont signalées comme « source
      secondaire » auprès de la règle.
    </p>
    <div class="table-wrap">
      <table class="method__table method__sources">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Donnée concernée</th>
            <th scope="col">Application</th>
            <th scope="col">Vérifiée le</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in secondary" :key="s.id">
            <th scope="row">
              <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.title }}</a>
              <span class="method__publisher">{{ s.publisher }}</span>
            </th>
            <td>{{ nbsp(s.rule) }}</td>
            <td>{{ s.appliesFrom }}</td>
            <td>{{ date(s.verifiedOn) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Hypothèses sans source</h3>
    <p>
      Les valeurs suivantes sont des hypothèses de travail, modifiables dans le simulateur, et non des règles : taux et frais par défaut
      des placements (moyennes de marché), rendements des profils de risque des unités de compte, inflation supposée, hausse de
      l'espérance de vie par décennie, âge de fin de simulation.
    </p>
  </section>
</template>
