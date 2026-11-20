<script setup lang="ts">
import SourceRef from './SourceRef.vue'
import { brackets, eur, eur2, ex, fiscal, pct } from './data'

const it = fiscal.incomeTax
const pa = fiscal.pensionAllowance
</script>

<template>
  <section id="m-fiscalite" class="method__section">
    <h2>3. Fiscalité</h2>
    <p>
      Le simulateur calcule l'impôt sur le revenu avec un moteur commun : barème, quotient familial et son plafonnement, décote.
      Quand le profil est complet (situation familiale, enfants, revenu imposable), chaque montant d'impôt ou d'économie d'impôt est
      la <strong>différence entre deux calculs complets de l'impôt</strong>, avec et sans le revenu ou la déduction concernés.
    </p>

    <h3 id="m-bareme">3.1 Barème progressif</h3>
    <p>
      L'impôt est calculé pour une part de quotient familial, tranche par tranche, puis multiplié par le nombre de parts
      <SourceRef id="brochure-ir-2026" />.
    </p>
    <table class="method__table">
      <caption>Barème appliqué aux revenus {{ fiscal.incomeYear }}, par part</caption>
      <thead><tr><th scope="col">Fraction du revenu par part</th><th scope="col">Taux</th></tr></thead>
      <tbody>
        <tr v-for="b in brackets" :key="b.rate">
          <th scope="row">{{ b.upTo === Infinity ? `au-delà de ${eur(b.from)}` : b.from === 0 ? `jusqu'à ${eur(b.upTo)}` : `de ${eur(b.from + 1)} à ${eur(b.upTo)}` }}</th>
          <td>{{ pct(b.rate) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>
        Célibataire, revenu imposable de {{ eur(40000) }} (1 part) : ({{ eur(29579) }} − {{ eur(11600) }}) × 11 % + ({{ eur(40000) }} −
        {{ eur(29579) }}) × 30 % = <strong>{{ eur2(ex.tax40k.tax) }}</strong>.
      </p>
    </div>

    <h3 id="m-tmi">3.2 Taux marginal d'imposition (TMI)</h3>
    <p>
      La TMI est le taux de la tranche où tombe le revenu par part ({{ pct(ex.tax40k.bracketRate) }} dans l'exemple ci-dessus). C'est le
      taux qui s'appliquerait à un euro de revenu en plus, tant que le revenu reste dans la même tranche. Elle ne mesure pas le poids
      moyen de l'impôt : ici {{ eur2(ex.tax40k.tax) }} pour {{ eur(40000) }}, soit environ {{ pct(Math.round((ex.tax40k.tax / 40000) * 1000) / 10) }}.
      Avec un profil, la TMI est calculée pour chaque année : elle change quand des enfants cessent d'être à charge.
    </p>

    <h3 id="m-quotient">3.3 Quotient familial</h3>
    <ul>
      <li>Parts de base : 1 pour une personne seule, 2 pour un couple marié ou pacsé (et pour une personne veuve avec enfant à charge).</li>
      <li>Enfants à charge : une demi-part pour chacun des deux premiers, une part à partir du troisième.</li>
      <li>Parent isolé vivant seul : une demi-part de plus <SourceRef id="impots-parent-isole" />.</li>
      <li>
        L'avantage procuré par les parts au-delà des parts de base est plafonné à {{ eur(it.qfCapPerHalfPart) }} par demi-part
        ({{ eur(it.qfCapSingleParent) }} pour les deux premières demi-parts du parent isolé) <SourceRef id="bofip-qf" />.
      </li>
    </ul>
    <p class="method__formula">impôt = max(impôt avec toutes les parts ; impôt avec les parts de base − plafond)</p>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>
        Couple marié avec deux enfants, {{ eur(ex.qf.income) }} : avec 3 parts, l'impôt serait de {{ eur2(ex.qf.uncapped) }} ; avec les
        2 parts de base, il est de {{ eur2(ex.qf.base.tax) }}. L'avantage ({{ eur2(ex.qf.base.tax - ex.qf.uncapped) }}) dépasse le plafond
        de 2 × {{ eur(it.qfCapPerHalfPart) }} = {{ eur(ex.qf.cap) }} : l'impôt est de {{ eur2(ex.qf.base.tax) }} − {{ eur(ex.qf.cap) }} =
        <strong>{{ eur2(ex.qf.result.tax) }}</strong>.
      </p>
    </div>

    <h3 id="m-decote">3.4 Décote</h3>
    <p>
      Les impôts faibles sont réduits d'une décote <SourceRef id="eco-decote" /> <SourceRef id="bofip-decote" /> :
    </p>
    <p class="method__formula">
      décote = {{ eur(it.decote.single) }} (personne seule) ou {{ eur(it.decote.couple) }} (couple) − {{ pct(it.decote.rate) }} × impôt brut, si positive
    </p>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>
        Célibataire, {{ eur(20000) }} : impôt brut {{ eur2(ex.decote.grossTax) }} ; décote {{ eur(it.decote.single) }} − {{ pct(it.decote.rate) }}
        × {{ eur2(ex.decote.grossTax) }} = {{ eur2(ex.decote.decote) }} ; impôt dû <strong>{{ eur2(ex.decote.tax) }}</strong>.
      </p>
    </div>

    <h3 id="m-pfu">3.5 Prélèvement forfaitaire unique et prélèvements sociaux</h3>
    <ul>
      <li>
        PFU : {{ pct(fiscal.pfuIncomeTax) }} d'impôt sur le revenu sur les revenus de placement (intérêts du livret bancaire, gains d'un
        PER, produits d'assurance vie de moins de 8 ans), sauf option globale pour le barème.
      </li>
      <li>
        Prélèvements sociaux : {{ pct(fiscal.social.capital) }} depuis le 1er janvier 2026 sur les revenus du capital, dont le livret
        bancaire et toutes les sorties de PER ; {{ pct(fiscal.social.lifeInsurance) }} pour l'assurance vie ; aucun sur le Livret A et le
        LDDS <SourceRef id="sp-csg" /> <SourceRef id="sp-ps-2026" />.
      </li>
      <li>En cas d'option pour le barème, {{ pct(fiscal.social.deductibleCsg) }} de CSG sont déductibles du revenu imposable de l'année suivante <SourceRef id="sp-csg" />.</li>
    </ul>

    <h3 id="m-abattements">3.6 Abattements</h3>
    <ul>
      <li>
        <strong>Assurance vie</strong> : {{ eur(fiscal.lifeInsurance.allowanceSingle) }} par an ({{ eur(fiscal.lifeInsurance.allowanceCouple) }}
        pour un couple) sur les produits des contrats de plus de 8 ans, pour l'impôt sur le revenu seulement (voir 2.3)
        <SourceRef id="legifrance-125-0-a" />.
      </li>
      <li>
        <strong>Pensions</strong> : {{ pct(pa.rate) }} des pensions, au moins {{ eur(pa.minPerPensioner) }} par pensionné, au plus
        {{ eur(pa.maxPerHousehold) }} par foyer <SourceRef id="sp-pensions" />. Il s'applique à la rente d'un PER issue de versements
        déduits, pas au capital.
      </li>
    </ul>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>
        Un retraité perçoit {{ eur(ex.pensions.holder) }} de pension (abattement : le plancher de {{ eur(pa.minPerPensioner) }}), son
        conjoint {{ eur(ex.pensions.spouse) }} (abattement {{ eur(ex.pensions.spouse / 10) }}). Abattement du foyer :
        {{ eur(ex.pensions.allowance) }}. Si le premier perçoit en plus une rente de {{ eur(ex.pensions.annuity) }}, son abattement reste de
        {{ eur(pa.minPerPensioner) }} (10 % de {{ eur(ex.pensions.holder + ex.pensions.annuity) }} est inférieur au plancher) : la rente est
        imposable en totalité, soit <strong>{{ eur(ex.pensions.annuityTaxable) }}</strong>. C'est pourquoi le profil demande les pensions du
        conjoint séparément.
      </p>
    </div>

    <h3 id="m-deduction-per">3.7 Déduction des versements PER et report des plafonds</h3>
    <p>
      Les versements sur un PER sont déductibles du revenu imposable dans la limite du plafond disponible : plafond de l'année, plafonds
      non utilisés des années précédentes, plafond du conjoint (voir 2.4) <SourceRef id="sp-per" />. L'économie d'impôt est calculée ainsi :
    </p>
    <p class="method__formula">économie d'impôt = impôt(revenu) − impôt(revenu − versements déduits)</p>
    <p>
      <strong>Pourquoi elle diffère de « versement × TMI ».</strong> Le produit versement × TMI suppose que tout le versement est retiré de
      la même tranche. C'est faux dès que la déduction fait changer de tranche, déclenche la décote ou modifie l'effet du plafonnement
      du quotient familial ; la part des versements au-delà du plafond, elle, n'apporte aucune économie.
    </p>
    <div class="method__example">
      <p class="method__example-title">Exemples (célibataire)</p>
      <ul>
        <li>
          Revenu de {{ eur(ex.savingBracket.income) }} (TMI {{ pct(ex.savingBracket.tmi) }}), versement déduit de {{ eur(ex.savingBracket.deduction) }} :
          une partie de la déduction tombe dans la tranche à 11 % et la décote s'applique au nouvel impôt. Économie réelle
          <strong>{{ eur2(ex.savingBracket.saving) }}</strong>, au lieu de {{ eur2(ex.savingBracket.naive) }}.
        </li>
        <li>
          Revenu de {{ eur(ex.savingDecote.income) }} (TMI {{ pct(ex.savingDecote.tmi) }}), versement déduit de {{ eur(ex.savingDecote.deduction) }} :
          la baisse de l'impôt brut augmente la décote. Économie réelle <strong>{{ eur2(ex.savingDecote.saving) }}</strong>, au lieu de
          {{ eur2(ex.savingDecote.naive) }}.
        </li>
      </ul>
      <p>Sans profil complet, le simulateur utilise versement × TMI et signale le résultat comme approximatif.</p>
    </div>

    <h3 id="m-sorties">3.8 Sorties en capital et en rente</h3>
    <ul>
      <li>
        <strong>Capital du PER issu de versements déduits</strong> : imposé au barème comme un revenu exceptionnel, avec le système du
        quotient si c'est plus favorable <SourceRef id="cgi-163-0-a" /> <SourceRef id="bofip-per-sortie" />. Le simulateur retient le
        plus faible des deux calculs.
      </li>
    </ul>
    <p class="method__formula">système du quotient : impôt = {{ fiscal.quotientSystemCoefficient }} × [impôt(revenu + capital ÷ {{ fiscal.quotientSystemCoefficient }}) − impôt(revenu)]</p>
    <div class="method__example">
      <p class="method__example-title">Exemple</p>
      <p>
        Retraité célibataire, revenu de {{ eur(ex.quotient.income) }}, {{ eur(ex.quotient.capital) }} de capital issu de versements déduits :
        imposition directe {{ eur2(ex.quotient.direct) }} ; système du quotient {{ eur2(ex.quotient.withQuotient) }}. Impôt retenu :
        <strong>{{ eur2(ex.quotient.tax) }}</strong>.
      </p>
    </div>
    <ul>
      <li><strong>Gains du PER, produits d'assurance vie, intérêts du livret bancaire</strong> : PFU ou taux propres à l'assurance vie (voir 2.2 à 2.4).</li>
      <li>
        <strong>Rentes</strong> : rente issue de versements déduits imposée comme une pension après abattement ; rente issue de versements non
        déduits imposée sur une fraction qui dépend de l'âge (voir 2.4). L'impôt est l'impôt supplémentaire dû sur le revenu de la retraite.
      </li>
    </ul>
  </section>
</template>
