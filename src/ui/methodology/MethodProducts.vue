<script setup lang="ts">
import SourceRef from './SourceRef.vue'
import { config, eur, eur2, ex, fiscal, num, pct } from './data'

const li = fiscal.lifeInsurance
const risk = config.riskProfiles
</script>

<template>
  <section id="m-placements" class="method__section">
    <h2>2. Fonctionnement des placements</h2>
    <p>
      Pour chaque placement : son fonctionnement, ses plafonds, la disponibilité du capital, le calcul des intérêts, les frais, la
      fiscalité, les risques et la façon dont le simulateur le modélise. Les avantages et inconvénients cités sont des
      caractéristiques générales, pas une appréciation de leur intérêt pour une situation donnée.
    </p>

    <!-- ---------- Livret A et LDDS ---------- -->
    <article id="m-livrets" class="method__product">
      <h3>2.1 Livret A et LDDS</h3>
      <p>
        Livrets d'épargne réglementés : le taux est fixé par les pouvoirs publics et identique dans toutes les banques. Le Livret A
        et le LDDS (livret de développement durable et solidaire) fonctionnent de la même façon ; seuls leurs plafonds
        diffèrent <SourceRef id="sp-livret-a" /> <SourceRef id="sp-ldds" />.
      </p>
      <dl class="method__facts">
        <div><dt>Taux par défaut</dt><dd>{{ pct(config.livretA.rate) }} par an pour les deux livrets</dd></div>
        <div><dt>Plafond des versements</dt><dd>{{ eur(config.livretA.cap) }} (Livret A), {{ eur(config.ldds.cap) }} (LDDS) ; les intérêts capitalisés peuvent le dépasser</dd></div>
        <div><dt>Disponibilité</dt><dd>versements et retraits à tout moment</dd></div>
        <div><dt>Fiscalité</dt><dd>intérêts exonérés d'impôt sur le revenu et de prélèvements sociaux : brut = net</dd></div>
        <div><dt>Avantages</dt><dd>capital disponible, pas de frais, pas d'impôt</dd></div>
        <div><dt>Inconvénients</dt><dd>versements plafonnés ; taux révisable, qui peut être inférieur à l'inflation</dd></div>
        <div><dt>Risques</dt><dd>pas de perte en capital ; le risque porte sur le rendement réel (après inflation)</dd></div>
      </dl>

      <h4>Calcul des intérêts</h4>
      <p>L'année compte 24 quinzaines (du 1er au 15 et du 16 à la fin du mois).</p>
      <p class="method__formula">intérêts de l'année = Σ (solde de la quinzaine × taux ÷ 24)</p>
      <ul>
        <li>Un versement rapporte à partir de la quinzaine suivante : versé le 1er, il rapporte à partir du 16.</li>
        <li>Un retrait cesse de rapporter dès le début de la quinzaine où il a lieu.</li>
        <li>Les intérêts sont arrondis au centime et capitalisés au 31 décembre ; si la simulation s'arrête en cours d'année, les intérêts courus sont versés à la clôture.</li>
      </ul>
      <div class="method__example">
        <p class="method__example-title">Exemple</p>
        <p>
          {{ eur(ex.livretA.deposit) }} versés en mars rapportent du 16 mars au 31 décembre, soit 19 quinzaines :
          {{ eur(ex.livretA.deposit) }} × {{ pct(config.livretA.rate) }} × 19 ÷ 24 = <strong>{{ eur2(ex.livretA.interest) }}</strong>
          au 31 décembre.
        </p>
      </div>

      <h4>Particularités de la simulation</h4>
      <ul>
        <li>Un versement qui ferait dépasser le plafond est réduit ou refusé, avec un message.</li>
        <li>Un capital initial supérieur au plafond est accepté (livret existant) ; aucun versement n'est alors possible tant que le solde dépasse le plafond.</li>
        <li>Le taux reste constant sur toute la durée simulée.</li>
      </ul>
    </article>

    <!-- ---------- Livret bancaire ---------- -->
    <article id="m-livret-bancaire" class="method__product">
      <h3>2.2 Livret bancaire fiscalisé</h3>
      <p>
        Livret d'épargne proposé librement par une banque, qui en fixe le taux et peut le modifier à tout moment. Certaines offres
        prévoient un taux « boosté » temporaire, éventuellement limité à un montant.
      </p>
      <dl class="method__facts">
        <div><dt>Taux par défaut</dt><dd>{{ pct(config.livretBancaire.baseRate) }} brut par an, sans boost</dd></div>
        <div><dt>Plafond</dt><dd>fixé par la banque (aucun par défaut)</dd></div>
        <div><dt>Disponibilité</dt><dd>versements et retraits à tout moment</dd></div>
        <div><dt>Fiscalité</dt><dd>intérêts soumis à l'impôt sur le revenu et aux prélèvements sociaux de {{ pct(fiscal.social.capital) }}</dd></div>
        <div><dt>Avantages</dt><dd>capital disponible, pas de plafond réglementaire</dd></div>
        <div><dt>Inconvénients</dt><dd>intérêts imposés ; taux et boosts fixés librement par la banque, souvent temporaires</dd></div>
        <div><dt>Risques</dt><dd>pas de perte en capital ; le risque porte sur le rendement réel et sur la baisse du taux</dd></div>
      </dl>

      <h4>Intérêts et fiscalité</h4>
      <p>
        Les intérêts sont calculés par quinzaine comme pour le Livret A. Pendant le boost, la part du solde sous le plafond du boost
        est rémunérée au taux boosté, le reste au taux de base. Au 31 décembre, la banque retient à la source les prélèvements
        sociaux ({{ pct(fiscal.social.capital) }}) et un acompte d'impôt de {{ pct(fiscal.pfuIncomeTax) }} : seuls les intérêts nets
        sont capitalisés <SourceRef id="sp-csg" />.
      </p>
      <ul>
        <li><strong>Prélèvement forfaitaire unique (PFU)</strong> : l'acompte vaut l'impôt définitif, soit {{ pct(fiscal.pfuIncomeTax + fiscal.social.capital) }} au total <SourceRef id="eco-livret-bancaire" />.</li>
        <li><strong>Dispense d'acompte</strong> (sous condition de revenu) : seuls les prélèvements sociaux sont retenus, l'impôt est payé l'année suivante.</li>
        <li>
          <strong>Option pour le barème</strong> : impôt définitif = impôt supplémentaire au barème, moins l'économie due à la CSG
          déductible ({{ pct(fiscal.social.deductibleCsg) }} des intérêts) <SourceRef id="sp-csg" /> ; la différence avec l'acompte est
          payée ou remboursée hors du livret.
        </li>
      </ul>
      <div class="method__example">
        <p class="method__example-title">Exemple</p>
        <p>
          {{ eur(ex.bancaire.capital) }} à {{ pct(1.5) }} pendant un an au PFU : {{ eur2(ex.bancaire.interest) }} d'intérêts, dont
          {{ eur2(ex.bancaire.withheld) }} retenus ({{ pct(fiscal.social.capital) }} + {{ pct(fiscal.pfuIncomeTax) }}). Solde au
          31 décembre : <strong>{{ eur2(ex.bancaire.finalGross) }}</strong>.
        </p>
      </div>

      <h4>Particularités de la simulation</h4>
      <ul>
        <li>Vue brute : solde réel du livret. Vue nette : solde moins les régularisations d'impôt payées à part (plus les remboursements).</li>
        <li>L'option pour le barème s'applique, en réalité, à tous les revenus de placement du foyer ; le simulateur l'applique aux seuls intérêts du livret simulé.</li>
        <li>La régularisation est comptée l'année des intérêts, au lieu de l'année suivante.</li>
      </ul>
    </article>

    <!-- ---------- Assurance vie ---------- -->
    <article id="m-assurance-vie" class="method__product">
      <h3>2.3 Assurance vie</h3>
      <p>
        Contrat d'épargne souscrit auprès d'un assureur. Les versements (primes) sont placés sur un fonds en euros, dont le capital
        est garanti par l'assureur, et sur des unités de compte (fonds investis notamment en actions ou obligations), dont la valeur
        varie.
      </p>
      <dl class="method__facts">
        <div><dt>Plafond</dt><dd>aucun plafond de versement</dd></div>
        <div><dt>Disponibilité</dt><dd>rachats partiels ou total à tout moment</dd></div>
        <div><dt>Frais par défaut</dt><dd>{{ pct(config.assuranceVie.entryFee) }} sur versements ; {{ pct(config.assuranceVie.euroFee) }} par an sur le fonds en euros et {{ pct(config.assuranceVie.ucFee) }} sur les unités de compte</dd></div>
        <div><dt>Fiscalité</dt><dd>seuls les produits contenus dans un rachat sont imposés, avec un régime plus favorable après 8 ans</dd></div>
        <div><dt>Avantages</dt><dd>capital disponible, abattement annuel après 8 ans, choix entre sécurité (fonds en euros) et potentiel de rendement (unités de compte)</dd></div>
        <div><dt>Inconvénients</dt><dd>frais de gestion annuels ; fiscalité plus lourde avant 8 ans</dd></div>
        <div><dt>Risques</dt><dd>fonds en euros : rendement fixé chaque année par l'assureur, défaillance de l'assureur ; unités de compte : perte en capital possible</dd></div>
      </dl>

      <h4>Rendement et frais</h4>
      <p class="method__formula">taux servi du fonds en euros = rendement brut − frais de gestion</p>
      <p>
        Avec les valeurs par défaut : {{ pct(config.assuranceVie.euroRate) }} − {{ pct(config.assuranceVie.euroFee) }} =
        {{ pct(config.assuranceVie.euroRate - config.assuranceVie.euroFee) }} par an. Les intérêts du fonds en euros sont crédités au
        31 décembre et supportent chaque année les prélèvements sociaux ({{ pct(fiscal.social.lifeInsurance) }}). Les unités de compte
        sont valorisées chaque mois au rendement moyen de leur profil, diminué des frais ; leurs prélèvements sociaux sont dus au
        rachat.
      </p>
      <table class="method__table">
        <caption>Profils de risque des unités de compte (hypothèses de travail, pas des données de marché)</caption>
        <thead><tr><th scope="col">Profil</th><th scope="col">Rendement moyen annuel</th><th scope="col">Fourchette basse / haute</th></tr></thead>
        <tbody>
          <tr><th scope="row">Prudent</th><td>{{ pct(risk.prudent.rate) }}</td><td>± {{ num(risk.prudent.spread) }} points</td></tr>
          <tr><th scope="row">Équilibré</th><td>{{ pct(risk.balanced.rate) }}</td><td>± {{ num(risk.balanced.spread) }} points</td></tr>
          <tr><th scope="row">Dynamique</th><td>{{ pct(risk.dynamic.rate) }}</td><td>± {{ num(risk.dynamic.spread) }} points</td></tr>
        </tbody>
      </table>

      <h4>Fiscalité des rachats</h4>
      <p class="method__formula">produits du rachat = montant racheté − primes × (montant racheté ÷ valeur du contrat)</p>
      <ul>
        <li>
          <strong>Primes versées depuis le 27/09/2017</strong> : {{ pct(fiscal.pfuIncomeTax) }} avant 8 ans ; après 8 ans,
          {{ pct(li.reducedRate) }} sur la part des produits correspondant à {{ eur(li.premiumsThreshold) }} de primes,
          {{ pct(fiscal.pfuIncomeTax) }} au-delà <SourceRef id="legifrance-125-0-a" />.
        </li>
        <li>
          <strong>Primes versées avant le 27/09/2017</strong> : {{ pct(li.pre2017Rates.under4Years) }} avant 4 ans,
          {{ pct(li.pre2017Rates.from4To8Years) }} de 4 à 8 ans, {{ pct(li.pre2017Rates.after8Years) }} après 8 ans
          <SourceRef id="eco-av" />.
        </li>
        <li>
          <strong>Abattement annuel après 8 ans</strong> : {{ eur(li.allowanceSingle) }} ({{ eur(li.allowanceCouple) }} pour un couple
          soumis à imposition commune), imputé d'abord sur les produits des primes anciennes, puis sur ceux taxés à
          {{ pct(li.reducedRate) }}, enfin sur ceux taxés à {{ pct(fiscal.pfuIncomeTax) }} <SourceRef id="legifrance-125-0-a" />.
        </li>
        <li>
          <strong>Seuil de {{ eur(li.premiumsThreshold) }}</strong> : primes nettes de rachats de tous les contrats de l'assuré au
          31 décembre de l'année précédente, primes antérieures au 27/09/2017 comprises <SourceRef id="bofip-av-150k" />.
        </li>
        <li><strong>Prélèvements sociaux</strong> : {{ pct(fiscal.social.lifeInsurance) }} des produits, sans abattement, moins ceux déjà prélevés chaque année sur le fonds en euros.</li>
        <li>
          <strong>Contrat en perte</strong> : si la valeur est inférieure aux primes, le produit d'un rachat partiel est nul et les primes
          restantes ne baissent que du montant racheté <SourceRef id="bofip-av-rachat" />.
        </li>
      </ul>
      <div class="method__example">
        <p class="method__example-title">Exemple</p>
        <p>
          Rachat de {{ eur(ex.av.withdrawal) }} sur un contrat de {{ eur(ex.av.value) }} constitué de {{ eur(ex.av.premiums) }} de
          primes récentes : produits = {{ eur(ex.av.withdrawal) }} − {{ eur(ex.av.premiums) }} × {{ eur(ex.av.withdrawal) }} ÷
          {{ eur(ex.av.value) }} = {{ eur2(ex.av.gains) }}.
        </p>
        <ul>
          <li>Contrat de 5 ans : impôt {{ eur2(ex.av.before8.incomeTax) }} ({{ pct(fiscal.pfuIncomeTax) }}) et prélèvements sociaux {{ eur2(ex.av.before8.social) }}.</li>
          <li>Contrat de 10 ans, célibataire : produits couverts par l'abattement de {{ eur(li.allowanceSingle) }}, impôt {{ eur2(ex.av.after8.incomeTax) }} ; prélèvements sociaux {{ eur2(ex.av.after8.social) }}.</li>
        </ul>
      </div>

      <h4>Particularités de la simulation</h4>
      <ul>
        <li>La répartition entre fonds en euros et unités de compte s'applique à chaque versement ; pas d'arbitrage ni de rééquilibrage.</li>
        <li>La valeur nette suppose un rachat total à la date considérée.</li>
        <li>Contrat existant : sa date d'ouverture sert à la règle des 8 ans ; les primes saisies déterminent les plus-values latentes. Sans primes saisies, ces plus-values sont ignorées (avertissement).</li>
        <li>Non modélisés : versements après 70 ans, transmission au décès, option pour le barème, abattement déjà consommé par des rachats sur d'autres contrats.</li>
      </ul>
    </article>

    <!-- ---------- PER ---------- -->
    <article id="m-per" class="method__product">
      <h3>2.4 Plan d'épargne retraite (PER)</h3>
      <p>
        Contrat d'épargne destiné à la retraite. Les versements peuvent être déduits du revenu imposable ; l'épargne est bloquée
        jusqu'au départ à la retraite, puis versée en capital, en rente viagère ou de façon mixte <SourceRef id="sp-per" />.
      </p>
      <dl class="method__facts">
        <div><dt>Plafond de déduction</dt><dd>10 % des revenus professionnels nets, entre {{ eur(fiscal.per.ceilingFloor) }} et {{ eur(fiscal.per.ceilingMax) }} ; pas de plafond de versement</dd></div>
        <div><dt>Disponibilité</dt><dd>bloquée jusqu'à la retraite, sauf déblocages anticipés (achat de la résidence principale, accidents de la vie)</dd></div>
        <div><dt>Frais par défaut</dt><dd>{{ pct(config.per.entryFee) }} sur versements ; {{ pct(config.per.euroFee) }} par an</dd></div>
        <div><dt>Fiscalité</dt><dd>économie d'impôt à l'entrée si les versements sont déduits ; imposition à la sortie</dd></div>
        <div><dt>Avantages</dt><dd>économie d'impôt immédiate, d'autant plus forte que le taux marginal est élevé</dd></div>
        <div><dt>Inconvénients</dt><dd>épargne bloquée ; sortie imposée ; rente viagère irréversible</dd></div>
        <div><dt>Risques</dt><dd>comme l'assurance vie pour les supports ; incertitude sur la fiscalité et sur sa propre situation à la retraite</dd></div>
      </dl>

      <h4>Déduction des versements</h4>
      <ul>
        <li>
          Plafond de l'année : 10 % des revenus professionnels nets, au moins {{ eur(fiscal.per.ceilingFloor) }}, au plus
          {{ eur(fiscal.per.ceilingMax) }}. Le plafond indiqué sur l'avis d'impôt fait foi et peut être saisi directement
          <SourceRef id="impots-plafond-per" />.
        </li>
        <li>
          Report : la part non utilisée d'un plafond reste utilisable {{ fiscal.per.carryYearsBefore }} ans pour les plafonds antérieurs
          à {{ fiscal.per.carryRuleChangeYear }}, {{ fiscal.per.carryYearsAfter }} ans à partir de ceux de {{ fiscal.per.carryRuleChangeYear }}.
          Les versements consomment d'abord le plafond de l'année, puis les reports du plus ancien au plus récent, puis le plafond du
          conjoint (mutualisation, couple marié ou pacsé) <SourceRef id="sp-per" />.
        </li>
        <li>Versements effectués à partir de {{ fiscal.per.deductionAgeLimit }} ans : non déductibles depuis {{ fiscal.per.deductionAgeLimitFromYear }} <SourceRef id="sp-per" />.</li>
      </ul>
      <div class="method__example">
        <p class="method__example-title">Exemple de plafond</p>
        <p>
          <template v-for="(c, i) in ex.ceilings" :key="c.income">{{ i > 0 ? ' ; ' : '' }}revenus de {{ eur(c.income) }} : plafond de {{ eur(c.ceiling) }}</template>.
        </p>
      </div>
      <p>L'économie d'impôt obtenue est détaillée dans la partie Fiscalité.</p>

      <h4>Sortie en capital</h4>
      <ul>
        <li>
          Part issue des versements déduits : imposée au barème comme une pension, sans l'abattement de 10 %, avec le système du
          quotient si c'est plus favorable ; pas de prélèvements sociaux <SourceRef id="bofip-per-sortie" />.
        </li>
        <li>Gains : PFU, soit {{ pct(fiscal.pfuIncomeTax) }} d'impôt et {{ pct(fiscal.social.capital) }} de prélèvements sociaux <SourceRef id="sp-ps-2026" />.</li>
        <li>Part issue des versements non déduits : exonérée ; seuls les gains sont imposés.</li>
        <li>
          Déblocage anticipé pour la résidence principale : imposé comme une sortie en capital. Accidents de la vie : capital exonéré
          d'impôt sur le revenu, gains soumis aux seuls prélèvements sociaux. Un déblocage l'année même d'un versement impose la part
          de ce versement qui sera déduite au 31 décembre.
        </li>
      </ul>

      <h4>Sortie en rente viagère</h4>
      <p>
        La rente est calculée à partir du prix d'un euro de rente, qui dépend de l'âge et d'une table de mortalité (TGF05). Le simulateur
        utilise un tarif publié de la table TGF05 à taux technique 0 % (tarif du 1er janvier 2026, âges 55 à 80 ans)
        <SourceRef id="tgf05" />.
      </p>
      <p class="method__formula">rente annuelle = capital converti ÷ prix d'un euro de rente × (1 − frais sur arrérages)</p>
      <div class="method__example">
        <p class="method__example-title">Exemple</p>
        <p>
          {{ eur(ex.annuity.capital) }} convertis à {{ ex.annuity.age }} ans, prix {{ num(ex.annuity.price) }}, frais sur arrérages de
          {{ pct(ex.annuity.fee) }} : {{ eur(ex.annuity.capital) }} ÷ {{ num(ex.annuity.price) }} × {{ num(1 - ex.annuity.fee / 100) }} =
          <strong>{{ eur2(ex.annuity.gross) }}</strong> par an avant impôts, soit {{ eur2(ex.annuity.gross / 12) }} par mois.
        </p>
      </div>
      <ul>
        <li>
          Si la table n'est pas garantie à la souscription, la table appliquée à une liquidation future tiendra compte de la hausse de
          l'espérance de vie. Le simulateur la représente par un décalage d'âge : âge de table = âge de départ −
          {{ num(config.per.annuity.lifeGainPerDecade) }} an par décennie jusqu'à la retraite (hypothèse de modélisation, fondée sur la tendance passée de l'espérance de vie à 60 ans).
        </li>
        <li>Méthode « taux de conversion » : rente = capital × taux du contrat × (1 − frais), pour reprendre un devis d'assureur.</li>
        <li>
          La rente est versée jusqu'au décès. L'âge de fin de simulation ({{ config.per.annuity.lifeExpectancy }} ans par défaut) ne sert
          qu'à totaliser les rentes perçues ; il ne limite pas la rente.
        </li>
      </ul>
      <p>Fiscalité de la rente :</p>
      <ul>
        <li>
          Issue de versements déduits : imposée comme une pension après l'abattement de 10 % (voir Fiscalité) ; prélèvements sociaux sur
          la fraction imposable selon l'âge.
        </li>
        <li>
          Issue de versements non déduits : rente viagère à titre onéreux, dont seule une fraction est imposable selon l'âge au premier
          versement : <template v-for="(r, i) in fiscal.per.annuityTaxableFractions" :key="r.maxAge">{{ i > 0 ? ', ' : '' }}{{ pct(r.fraction) }} {{ i === 0 ? `avant ${r.maxAge + 1} ans` : r.maxAge === Infinity ? `à partir de ${fiscal.per.annuityTaxableFractions[i - 1].maxAge + 1} ans` : `de ${fiscal.per.annuityTaxableFractions[i - 1].maxAge + 1} à ${r.maxAge} ans` }}</template>{{ ' ' }}<SourceRef id="cgi-158" />. À {{ ex.annuity.age }} ans : {{ pct(ex.annuity.rvtoFraction * 100) }}.
        </li>
      </ul>

      <h4>Particularités de la simulation</h4>
      <ul>
        <li>Durée de la phase d'épargne = âge de départ − âge actuel. Les retraits sont refusés avant la retraite, sauf déblocages anticipés.</li>
        <li>
          Avec un profil complet (situation, enfants, revenus), l'impôt est calculé au barème ; sinon le simulateur applique un taux
          marginal fixe et signale le résultat comme approximatif.
        </li>
        <li>Sortie mixte : la part en capital et la première année de rente sont imposées séparément, chacune par rapport au revenu de la retraite.</li>
        <li>Option « réinvestir les économies d'impôt » : l'économie est versée sur le PER le mois suivant et n'est plus comptée à part.</li>
        <li>Non modélisés : plafonds des travailleurs non salariés, révision du plafond (supposé constant), rentes réversibles ou à annuités garanties.</li>
      </ul>
    </article>

    <!-- ---------- Transmission et décès (SPEC §5.7) ---------- -->
    <article id="m-transmission" class="method__product">
      <h3>2.5 Garanties, transmission et disponibilité après le décès</h3>
      <p>
        Ces règles ne sont pas simulées ; elles complètent la comparaison qualitative affichée sous chaque carte. On distingue les
        obligations légales, les pratiques habituelles (délais indicatifs, jamais garantis) et les dispositions propres à chaque contrat.
      </p>

      <h4>Garanties</h4>
      <ul>
        <li><strong>Garantie du capital</strong> : livrets et fonds en euros ne peuvent pas perdre de valeur (hors frais, selon le contrat) ; les unités de compte, si.</li>
        <li>
          <strong>Livret A, LDDS et LEP</strong> : garantie de l'État de 100 000 € par client et par établissement, qui s'ajoute à la garantie des
          dépôts <SourceRef id="tresor-garantie" /> <SourceRef id="fgdr" />.
        </li>
        <li><strong>Dépôts bancaires</strong> (comptes, livrets bancaires) : fonds de garantie des dépôts et de résolution (FGDR), 100 000 € par client et par établissement.</li>
        <li>
          <strong>Contrats d'assurance éligibles</strong> (assurance vie) : fonds de garantie des assurances de personnes (FGAP), 70 000 € par
          assuré, souscripteur ou bénéficiaire <SourceRef id="ca-r423-7" />. Pour un PER, la protection dépend de sa forme (assurance ou compte-titres).
        </li>
      </ul>

      <h4>Livrets et comptes bancaires</h4>
      <ul>
        <li>
          Le solde entre dans la succession. Les comptes et livrets individuels, Livret A et LDDS compris, sont bloqués dès que la banque est
          informée du décès ; un compte joint reste en principe utilisable, sauf opposition des héritiers. Les frais d'obsèques, de dernière
          maladie et les impôts du défunt peuvent être réglés sur ses comptes dans la limite de 5 965 € <SourceRef id="sp-comptes-deces" />.
        </li>
        <li>
          La déclaration de succession doit être déposée dans les 6 mois du décès <SourceRef id="sp-declaration-succession" /> : c'est un délai
          fiscal, pas une durée de blocage. Le règlement de la succession prend un temps variable, souvent plusieurs mois.
        </li>
      </ul>

      <h4>Assurance vie</h4>
      <ul>
        <li>Le capital versé aux bénéficiaires désignés ne fait pas partie de la succession <SourceRef id="ca-l132-12" />.</li>
        <li>
          La fiscalité dépend de l'<strong>âge de l'assuré au moment de chaque versement</strong> <SourceRef id="impots-av-beneficiaire" /> :
          versements avant 70 ans, abattement de 152 500 € par bénéficiaire, puis 20 % jusqu'à 700 000 € et 31,25 % au-delà
          <SourceRef id="cgi-990-i" /> ; versements à partir de 70 ans, droits de succession sur les primes au-delà d'un abattement global de
          30 500 €, les gains étant exclus <SourceRef id="cgi-757-b" /> <SourceRef id="bofip-av-deces" />.
        </li>
        <li>
          Le conjoint marié et le partenaire de PACS sont exonérés <strong>lorsqu'ils sont bénéficiaires</strong> : le simulateur ne le suppose pas,
          tout dépend de la clause bénéficiaire.
        </li>
        <li>
          L'assureur paie dans le mois qui suit la réception des pièces, sous peine d'intérêts de retard <SourceRef id="ca-l132-23-1" /> ; de son
          vivant, l'assuré obtient la valeur de rachat dans un délai de deux mois au plus <SourceRef id="ca-l132-21" />.
        </li>
      </ul>

      <h4>PER</h4>
      <ul>
        <li>
          PER assurance : capital versé aux bénéficiaires désignés. La fiscalité dépend de l'<strong>âge du titulaire au décès</strong> : avant
          70 ans, abattement de 152 500 € par bénéficiaire puis 20 % et 31,25 % ; à partir de 70 ans, droits de succession au-delà de 30 500 €,
          sur le montant total, gains compris <SourceRef id="sp-per" /> <SourceRef id="cgi-757-b" />.
        </li>
        <li>PER bancaire (compte-titres) : les sommes entrent dans la succession.</li>
        <li>
          Après la liquidation en rente : une rente simple s'arrête au décès. Une rente réversible continue d'être versée au bénéficiaire
          désigné ; des annuités garanties prolongent les versements jusqu'à la fin de la période garantie (selon le contrat). Ces options
          réduisent le montant de la rente ; le simulateur calcule une rente simple.
        </li>
      </ul>
    </article>
  </section>
</template>
