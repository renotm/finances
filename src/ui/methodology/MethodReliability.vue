<script setup lang="ts">
import { appVersion, config, date } from './data'
</script>

<template>
  <section id="m-fiabilite" class="method__section">
    <h2>7. Fiabilité et validation</h2>
    <p>Les vérifications suivantes ont été réellement menées. Elles réduisent le risque d'erreur sans le supprimer.</p>
    <dl class="method__terms">
      <div>
        <dt>Audit fonctionnel et financier</dt>
        <dd>
          Un audit interne a passé en revue chaque placement, chaque règle fiscale et les indicateurs de comparaison. Les anomalies relevées
          ont été corrigées ou documentées comme limites. Cet audit n'est pas indépendant.
        </dd>
      </div>
      <div>
        <dt>Vérification des règles</dt>
        <dd>Les paramètres fiscaux ont été comparés aux sources de la partie 6 ; les règles qui restent incertaines sont signalées en 5.1.</dd>
      </div>
      <div>
        <dt>Calculs indépendants</dt>
        <dd>
          Les résultats attendus des tests sont calculés à la main à partir des règles écrites, pas recopiés depuis le code du simulateur.
          Les exemples chiffrés de cette page sont calculés par le simulateur lui-même et comparés à ces calculs.
        </dd>
      </div>
      <div>
        <dt>Tests automatisés</dt>
        <dd>
          Moteur fiscal (barème, quotient familial, décote, système du quotient, abattements), chaque placement, indicateurs de comparaison,
          cohérence des flux, et montants affichés à l'écran identiques à ceux du calcul.
        </dd>
      </div>
      <div>
        <dt>Tests de non-régression</dt>
        <dd>
          Tous les tests sont rejoués à chaque modification. Un résultat attendu n'est modifié que si la règle qu'il figeait était fausse, et la
          correction est justifiée par écrit.
        </dd>
      </div>
      <div>
        <dt>Cas limites</dt>
        <dd>
          Bornes des tranches du barème, passage des 8 ans d'un contrat, changements d'âge, retraits totaux, rendements nuls ou négatifs, frais
          supérieurs au rendement, simulations de 60 ans, saisies incohérentes.
        </dd>
      </div>
    </dl>
    <p>
      Les tests vérifient que le simulateur applique les règles telles qu'elles ont été comprises et écrites ; ils ne garantissent pas
      l'exactitude des résultats. Une règle mal comprise le serait aussi dans le test. Le simulateur n'a fait l'objet d'aucune certification
      ni d'aucune validation par un organisme public ou professionnel.
    </p>
    <dl class="method__facts">
      <div><dt>Version du simulateur</dt><dd>{{ appVersion }}</dd></div>
      <div><dt>Méthodologie mise à jour le</dt><dd>{{ date(config.methodologyUpdatedAt) }}</dd></div>
    </dl>
  </section>
</template>
