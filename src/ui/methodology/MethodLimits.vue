<script setup lang="ts">
import { config, fiscal } from './data'
</script>

<template>
  <section id="m-limites" class="method__section">
    <h2>5. Limites et approximations</h2>
    <p>
      Les résultats sont des projections calculées à partir d'hypothèses. Aucune n'est une prévision ni une garantie. Les limites
      ci-dessous sont celles que le simulateur connaît ; d'autres peuvent exister.
    </p>

    <h3>5.1 Incertitudes fiscales restantes</h3>
    <ul>
      <li>
        <strong>Assiette de l'impôt sur les rachats d'assurance vie.</strong> Le simulateur calcule l'impôt sur les produits nets des
        prélèvements sociaux déjà prélevés chaque année sur le fonds en euros (lecture de l'article 125-0 A du CGI). Ce point n'est pas
        confirmé par la doctrine administrative consultée : l'impôt peut être légèrement sous-estimé si l'assiette retenue par l'assureur
        est brute.
      </li>
      <li>
        <strong>Cas particuliers du quotient familial</strong> non vérifiés ni modélisés : garde alternée, demi-parts spéciales (invalidité,
        anciens combattants, personnes ayant élevé seules un enfant), personnes à charge autres que les enfants.
      </li>
      <li>
        <strong>Stabilité des règles.</strong> Le barème, les plafonds et les taux des revenus {{ fiscal.incomeYear }} sont appliqués à toutes
        les années simulées. En pratique, le barème est revalorisé chaque année, et la fiscalité de l'épargne a changé plusieurs fois
        (prélèvements sociaux en 2026, déduction PER après 70 ans, durée du report des plafonds).
      </li>
    </ul>

    <h3>5.2 Approximations de calcul</h3>
    <ul>
      <li>Impôts et économies d'impôt comptés l'année des revenus ou des versements, et non l'année suivante où ils sont payés ou obtenus.</li>
      <li>Revenus du foyer constants ; plafond de déduction du PER constant, sans indexation.</li>
      <li>Sans profil complet : impôt calculé avec un taux marginal fixe, signalé comme approximatif.</li>
      <li>Livret bancaire : option pour le barème appliquée aux seuls intérêts du livret, alors qu'elle vaut pour tous les revenus de placement du foyer.</li>
      <li>Assurance vie : produits répartis entre primes anciennes et récentes au prorata des primes ; primes des autres contrats supposées versées depuis le 27/09/2017 ; abattement non réduit par des rachats sur d'autres contrats.</li>
      <li>PER : mutualisation des plafonds arrêtée l'année suivant les 70 ans du titulaire (l'âge du conjoint n'est pas demandé) ; en sortie mixte, capital et rente imposés séparément ; sans pensions renseignées, abattement de 10 % appliqué à la rente sans plancher ; sans pensions du conjoint, toutes les pensions du foyer attribuées au titulaire.</li>
    </ul>

    <h3>5.3 Rendements futurs et projections longues</h3>
    <ul>
      <li>Un seul taux moyen par support sur toute la durée : les taux des livrets, des fonds en euros et des marchés varient en réalité chaque année.</li>
      <li>Les rendements des unités de compte sont des hypothèses de travail ; les performances passées ne préjugent pas des performances futures, et une perte en capital est possible.</li>
      <li>Plus la durée est longue, plus l'écart entre la projection et la réalité peut être grand : taux, inflation, fiscalité et situation personnelle évoluent.</li>
      <li>Inflation supposée constante ({{ config.comparison.inflationRate }} % par défaut).</li>
    </ul>

    <h3>5.4 Particularités contractuelles non prises en compte</h3>
    <ul>
      <li>Frais propres à chaque contrat autres que ceux saisis : frais d'arbitrage, frais de sortie, frais des fonds eux-mêmes, garanties optionnelles.</li>
      <li>Arbitrages et rééquilibrages entre fonds en euros et unités de compte ; bonus de taux temporaires des fonds en euros.</li>
      <li>Conditions de rémunération propres à une banque (taux par paliers, modification du taux en cours d'année).</li>
      <li>Travailleurs non salariés (plafonds PER spécifiques), transmission au décès, versements d'assurance vie après 70 ans.</li>
    </ul>

    <h3>5.5 Rentes viagères</h3>
    <ul>
      <li>
        Le montant est une <strong>estimation</strong> : chaque assureur applique son propre tarif (table, taux technique, frais). Le
        simulateur utilise un tarif publié de la table TGF05 à taux technique 0 %, disponible pour les âges de 55 à 80 ans ; hors de ces âges,
        il retient l'âge le plus proche et l'indique.
      </li>
      <li>La hausse future de l'espérance de vie est représentée par un décalage d'âge fixe par décennie : c'est une hypothèse.</li>
      <li>Rente fixe, sans revalorisation, sans réversion au conjoint ni annuités garanties.</li>
      <li>Le total des rentes perçues dépend de l'âge de fin de simulation ({{ config.per.annuity.lifeExpectancy }} ans par défaut), qui n'est qu'une hypothèse de durée de vie.</li>
    </ul>
  </section>
</template>
