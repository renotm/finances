<script setup lang="ts">
import { config, date, fiscal } from './data'
</script>

<template>
  <section id="m-principes" class="method__section">
    <h2>1. Principes</h2>

    <h3>Objectif</h3>
    <p>
      Le simulateur projette l'évolution d'un placement d'épargne dans le temps et compare jusqu'à trois placements côte à côte :
      Livret A, LDDS, livret bancaire fiscalisé, assurance vie et plan d'épargne retraite (PER). Il sert à comprendre l'effet des
      versements, des taux, des frais et de la fiscalité française sur un placement. Il ne recommande aucun placement.
    </p>

    <h3>Fonctionnement</h3>
    <ul>
      <li>
        La simulation avance <strong>mois par mois</strong> à partir d'un mois de début, pour une durée en années (pour le PER, jusqu'à
        l'âge de départ, puis pendant le versement de la rente).
      </li>
      <li>
        Chaque placement est décrit par des paramètres dont les valeurs par défaut viennent d'un fichier de configuration
        (taux, frais, plafonds) ; l'utilisateur peut les modifier. Les paramètres fiscaux (barème, plafonds, taux de
        prélèvements) sont regroupés et datés à part.
      </li>
      <li>
        Le calcul est fait entièrement dans le navigateur. Les profils enregistrés restent dans le stockage du navigateur et ne
        sont envoyés nulle part.
      </li>
    </ul>

    <h3>Conventions de calcul</h3>
    <ul>
      <li>Un versement périodique est crédité le 1er du mois ; un mouvement ponctuel a lieu au mois indiqué.</li>
      <li>
        Un taux moyen annuel unique s'applique sur toute la durée, par support. Les taux réels varient : le Livret A est révisé
        deux fois par an, le rendement d'un fonds en euros est fixé chaque année par l'assureur.
      </li>
      <li>
        Livrets : intérêts calculés par quinzaine, arrondis au centime et capitalisés au 31 décembre. Fonds en euros : intérêts
        crédités au 31 décembre. Unités de compte : valorisation mensuelle.
      </li>
      <li>
        Les impôts et les économies d'impôt sont comptés l'année des revenus ou des versements, alors qu'ils sont réellement
        payés ou obtenus l'année suivante.
      </li>
      <li>Les revenus du foyer sont supposés constants pendant toute la durée simulée.</li>
    </ul>

    <h3>Brut, net, gains et économies d'impôt</h3>
    <dl class="method__terms">
      <div>
        <dt>Valeur brute</dt>
        <dd>Valeur du placement après frais de gestion, avant les impôts et prélèvements dus à la sortie.</dd>
      </div>
      <div>
        <dt>Valeur nette</dt>
        <dd>
          Ce que l'épargnant toucherait en retirant tout à la fin de la simulation, après frais, impôts et prélèvements sociaux.
          Pour le PER, elle inclut les économies d'impôt obtenues à l'entrée (sauf si elles sont réinvesties) et, en cas de rente,
          les rentes nettes perçues jusqu'à l'âge de fin de simulation.
        </dd>
      </div>
      <div>
        <dt>Gains</dt>
        <dd>Intérêts et plus-values produits par le placement, avant frais.</dd>
      </div>
      <div>
        <dt>Économies d'impôt</dt>
        <dd>
          Baisse de l'impôt sur le revenu due à la déduction des versements sur un PER. Elle n'est pas dans le placement : elle reste
          disponible pour l'épargnant, d'où la ligne « capital disponible » qui l'exclut.
        </dd>
      </div>
    </dl>

    <h3>Date de référence</h3>
    <p>
      Les règles fiscales appliquées sont celles de l'imposition des revenus {{ fiscal.incomeYear }} (déclarés en
      {{ fiscal.incomeYear + 1 }}), avec les prélèvements sociaux en vigueur depuis le 1er janvier 2026. Paramètres vérifiés le
      {{ date(fiscal.verifiedOn) }}. Ces règles sont supposées <strong>stables</strong> pendant toute la durée simulée, ce qui ne sera
      pas le cas : le barème est revalorisé chaque année et la fiscalité de l'épargne change régulièrement. Les valeurs par
      défaut des placements (taux, frais) ont été vérifiées le {{ date(config.updatedAt) }}.
    </p>
  </section>
</template>
