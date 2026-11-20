<script setup lang="ts">
import { config, eur, eur2, ex, pct, pctOf } from './data'
</script>

<template>
  <section id="m-comparaison" class="method__section">
    <h2>4. Méthodes de comparaison</h2>

    <h3>4.1 Rendement annualisé et taux de rendement interne (TRI)</h3>
    <p>
      Le rendement affiché est le taux de rendement interne des flux de l'épargnant : versements (négatifs), puis retraits, rentes,
      économies d'impôt et valeur finale (positifs). C'est le taux annuel unique pour lequel la valeur actuelle de ces flux est nulle.
      Il tient compte des dates de chaque versement, contrairement à un simple rapport entre gain et capital versé.
    </p>
    <p class="method__formula">Σ flux du mois m ÷ (1 + r)<sup>m</sup> = 0, puis rendement annuel = (1 + r)<sup>12</sup> − 1</p>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>{{ eur(1000) }} versés, {{ eur(1100) }} récupérés un an plus tard : rendement annuel <strong>{{ pctOf(ex.irr ?? 0) }}</strong>.</p>
    </div>
    <ul>
      <li>Le rendement brut utilise la valeur brute ; le rendement net, la valeur nette (après impôts, économies d'impôt comprises).</li>
      <li>
        Quand les flux changent plusieurs fois de signe (versements et retraits mêlés), plusieurs taux peuvent annuler la valeur actuelle.
        Le rendement est alors affiché « non pertinent ». Si aucun taux ne l'annule, il est « non calculable ».
      </li>
      <li>
        Limites du calcul : la recherche se fait sur une grille de taux mensuels de −50 % à +50 %, avec un pas de 0,01 point entre −2 % et
        +5 % par mois et de 0,25 point ailleurs. Deux rendements plus proches que ce pas peuvent ne pas être détectés ; le rendement est
        alors « non calculable », jamais faux.
      </li>
    </ul>

    <h3>4.2 Capital net disponible et économies fiscales cumulées</h3>
    <p>
      La synthèse distingue la valeur nette totale et le <strong>capital disponible</strong>, qui exclut les économies d'impôt conservées
      par l'épargnant. Les économies d'impôt cumulées sont affichées à part. Si l'option du PER « réinvestir les économies d'impôt » est
      choisie, elles sont versées sur le PER et ne sont plus ajoutées à la valeur nette, pour ne pas les compter deux fois.
    </p>

    <h3>4.3 Effort d'épargne</h3>
    <p class="method__formula">effort d'épargne = versements − économies d'impôt réinvesties</p>
    <p>
      Comparer deux placements n'a de sens qu'à effort égal : un placement auquel on a versé davantage finit naturellement plus haut. Une
      note signale les colonnes dont l'effort diffère.
    </p>

    <h3>4.4 Inflation</h3>
    <p>
      Le simulateur calcule en euros courants. L'inflation supposée ({{ pct(config.comparison.inflationRate) }} par défaut, modifiable) sert à
      deux indicateurs :
    </p>
    <p class="method__formula">rendement réel = (1 + rendement nominal) ÷ (1 + inflation) − 1</p>
    <p class="method__formula">gain en euros d'aujourd'hui = Σ flux du mois m ÷ (1 + inflation)<sup>m/12</sup></p>
    <div class="method__example">
      <p class="method__example-title">Exemples</p>
      <ul>
        <li>Rendement de 3 % et inflation de 2 % : rendement réel {{ pctOf(ex.real) }}.</li>
        <li>{{ eur(1000) }} reçus dans 10 ans valent aujourd'hui {{ eur2(ex.pv) }} avec 2 % d'inflation par an.</li>
      </ul>
    </div>

    <h3>4.5 Capital ou rente</h3>
    <p>
      Pour un PER en rente, la synthèse indique le capital net qu'aurait donné la même part en sortie en capital (impôt calculé de la même
      manière) et l'âge à partir duquel les rentes nettes cumulées le dépassent. Cet âge dépend directement de la durée de vie, inconnue :
      la rente est plus avantageuse pour qui vit longtemps, le capital pour qui décède tôt, et le capital reste transmissible alors que la
      rente s'arrête au décès.
    </p>

    <h3>4.6 Scénarios de rendement</h3>
    <p>
      Pour les unités de compte, le graphique ajoute une fourchette basse et haute : rendement moyen du profil plus ou moins un écart fixe
      (voir 2.3). Ce sont des hypothèses de calcul à rendement constant, pas des probabilités : les rendements réels varient d'une année à
      l'autre et peuvent sortir de la fourchette.
    </p>

    <h3>4.7 Conditions d'une comparaison valable</h3>
    <ul>
      <li><strong>Même durée.</strong> Des placements de durées différentes n'ont pas des valeurs finales comparables ; le gain en euros d'aujourd'hui réduit l'écart sans le supprimer, car il ignore ce que deviendrait l'argent après la fin du placement le plus court. Une note le signale : simulez les placements sur une même durée.</li>
      <li><strong>Même effort d'épargne</strong>, économies d'impôt réinvesties comprises.</li>
      <li><strong>Même niveau de risque, ou risque pris en compte.</strong> Un rendement d'unités de compte n'est pas comparable à un taux garanti.</li>
      <li><strong>Même disponibilité.</strong> Un PER bloqué jusqu'à la retraite ne rend pas le même service qu'un livret disponible à tout moment.</li>
      <li><strong>Même hypothèse fiscale.</strong> Une économie d'impôt calculée avec un profil complet n'est pas comparable à une estimation par la TMI.</li>
    </ul>
  </section>
</template>
