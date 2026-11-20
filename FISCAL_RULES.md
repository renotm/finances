# Règles fiscales et financières du simulateur

> Référence des règles appliquées par le moteur, avec leurs formules, leurs sources et leurs dates d'application.
> Paramètres chiffrés : `src/config/fiscal.ts` (revenus 2025, vérifiés le 20/11/2026).
> Chaque règle porte un niveau de fiabilité : **officielle** (Service-Public, Bercy infos, BOFiP, loi), **concordante** (plusieurs sources spécialisées concordantes, texte officiel non consulté directement), **hypothèse** (choix de modélisation documenté).

## 1. Impôt sur le revenu (moteur commun, `src/engine/tax/incomeTax.ts`)

### 1.1 Barème (CGI art. 197) — officielle
Barème applicable aux revenus 2025, par part : 0 % jusqu'à 11 600 €, 11 % jusqu'à 29 579 €, 30 % jusqu'à 84 577 €, 41 % jusqu'à 181 917 €, 45 % au-delà.
Sources : Bercy infos, Hagnéré Patrimoine, Kohen Avocats (barème 2026).

### 1.2 Quotient familial — officielle
- Parts de base : 1 (célibataire, divorcé, veuf sans enfant) ; 2 (couple marié ou pacsé ; veuf avec enfant à charge).
- Enfants à charge : 0,5 part chacun pour les deux premiers, 1 part à partir du troisième.
- Parent isolé (case T) : 0,5 part de plus, **à condition de vivre seul** ; en concubinage, pas de demi-part (impots.gouv.fr, « Je vis seul(e) avec des personnes à charge »).
- Enfant à charge pour les revenus de l'année Y : moins de 18 ans au 1er janvier de Y, ou rattaché jusqu'à 21 ans (25 ans s'il est étudiant), sans limite s'il est invalide (CGI art. 196, 196 B).
Sources : Bercy infos (quotient familial), justice.fr, impots.gouv.fr.

### 1.3 Plafonnement du quotient familial — officielle / concordante
L'avantage des parts au-delà des parts de base est limité à 1 807 € par demi-part (revenus 2025).
Pour le parent isolé, la part du premier enfant est plafonnée à 4 262 € (une source cite 4 224 € ; 4 262 € est retenu par la majorité des sources et par l'administration selon justice.fr — **à confirmer** sur la brochure pratique IR 2026).
Formule : impôt = max(impôt avec toutes les parts ; impôt avec les parts de base − plafond).

### 1.4 Décote — officielle
Décote = forfait − 45,25 % × impôt brut, si positive, sans dépasser l'impôt. Forfait : 897 € (personne seule), 1 483 € (couple soumis à imposition commune). Revenus 2025.
Source : Bercy infos « Pouvez-vous bénéficier de la décote » (17/04/2026), BOFiP BOI-IR-LIQ-20-20-30.

### 1.5 Impôt supplémentaire et économie d'une déduction — formule
- Impôt supplémentaire d'un revenu R' : impôt(R + R') − impôt(R).
- Économie d'une déduction D : impôt(R) − impôt(R − D).
Ces différences intègrent automatiquement les changements de tranche, le plafonnement et la décote. La TMI (tranche) n'est qu'une approximation, exacte seulement si le revenu reste dans la même tranche.

### 1.6 Système du quotient (CGI art. 163-0 A) — officielle (BOFiP cité)
Impôt d'un revenu exceptionnel E : coef × [impôt(R + E / coef) − impôt(R)], avec coef = 4. Le contribuable n'opte que si c'est favorable : le moteur retient le minimum entre l'imposition directe et le quotient.
Applicable à la part du capital PER issue de versements déduits, quel que soit son montant (BOFiP BOI-RSA-PENS-30-10-20, cité par Hagnéré Patrimoine et ERES).

### 1.7 Abattement de 10 % sur les pensions (CGI art. 158-5 a) — concordante
10 % des pensions, au minimum 454 € par pensionné (sans dépasser la pension), au maximum 4 439 € par foyer (revenus 2025).
Sources : Moneyvox, Goodvest, Toutsurmesfinances (concordantes). Une source isolée cite encore les montants des revenus 2024.

### 1.8 Contexte fiscal transmis aux placements — hypothèse
Le profil transmet aux colonnes : situation, enfants (dates de naissance, rattachement, invalidité), vie seule ou en concubinage, revenu net imposable du foyer pendant l'épargne, revenu imposable et pensions brutes à la retraite.
- Les revenus sont supposés **constants** (pas d'évolution des salaires ni de revalorisation du barème).
- Le barème des revenus 2025 est appliqué à toutes les années simulées (**hypothèse de stabilité des règles fiscales**).
- Sans contexte (profil incomplet ou TMI saisie à la main), le moteur applique une TMI fixe et signale les résultats comme **approximatifs**.

## 2. Prélèvements sociaux — officielle
- 18,6 % sur les revenus du capital depuis le 1er janvier 2026 (LFSS 2026), dont livrets bancaires et toutes les sorties de PER, en capital comme en rente (Service-Public A18841).
- 17,2 % pour l'assurance vie, exclue de la hausse (LFSS 2026 art. 12, cité par Défiscalisation France, Time2money ; **concordante**).
- CSG déductible de 6,8 % en cas d'option pour le barème (Moneyvox, AXA ; le maintien à 6,8 % malgré la hausse de la CSG est **à confirmer**).

## 3. PER (règles appliquées en phase 2)
- Plafond de déduction des salariés : 10 % des revenus professionnels nets, plancher 4 710 €, maximum 37 680 € (PASS 2025) — concordante.
- Report des plafonds non utilisés : 3 ans pour ceux nés avant 2026, 5 ans pour ceux nés à partir de 2026 (LF 2026 art. 10 ; BOFiP du 10/08/2026 cité par Goodvest et Moneyvox) — officielle (citée).
- Imputation : plafond de l'année, puis reports du plus ancien au plus récent — officielle (citée).
- Mutualisation entre conjoints mariés ou pacsés (case 6QR, option annuelle) — officielle (citée). Elle cesse l'année suivant les 70 ans de l'un des conjoints (BOFiP cité par Harvest).
- Versements effectués à partir de 70 ans : non déductibles depuis le 1er janvier 2026 (LF 2026, loi n° 2026-103 du 19/02/2026, art. 9) — officielle (citée).
- Sortie en capital : part issue des versements déduits imposée au barème dans la catégorie des pensions, **sans abattement de 10 %**, éligible au système du quotient ; gains au PFU (12,8 % + 18,6 %) ; versements non déduits exonérés — officielle (BOFiP cité).
- Rente issue de versements déduits : barème après abattement de 10 % (plafonné, voir 1.7), prélèvements sociaux sur la fraction imposable selon l'âge ; issue de versements non déduits : rente viagère à titre onéreux, fraction imposable selon l'âge à l'entrée en jouissance (70 / 50 / 40 / 30 %, CGI art. 158-6) — concordante.
- Déblocage anticipé « résidence principale » : même fiscalité qu'une sortie en capital. « Accidents de la vie » : capital exonéré d'impôt sur le revenu, gains soumis aux seuls prélèvements sociaux — concordante.
- Montant de la rente : table TGF05 à taux technique 0 %, prix d'un euro de rente selon l'âge (tarif du 1/1/2026, Guide de la taxe) — concordante ; projection pour une liquidation future : décalage d'âge selon la hausse de l'espérance de vie — **hypothèse**.

**Hypothèses de modélisation du PER (phase 2)**
- Les versements sont déductibles l'année de leur versement, dans l'ordre : plafond de l'année, reports du plus ancien au plus récent, plafond du conjoint. L'économie d'impôt est comptée au 31 décembre de l'année (elle réduit en réalité l'impôt payé l'année suivante).
- Le plafond annuel est supposé constant pendant toute la phase d'épargne.
- Mutualisation : l'âge du conjoint n'étant pas connu, elle s'arrête l'année suivant les 70 ans du titulaire.
- Pensions du foyer à la retraite non renseignées : l'abattement de 10 % s'applique à la rente sans plancher (le plancher est supposé absorbé par les autres pensions), dans la limite du plafond du foyer.
- Sortie mixte : la part en capital et la première année de rente sont imposées séparément, chacune par rapport au revenu imposable à la retraite (l'interaction des deux la même année n'est pas cumulée).
- Comparaison rente / capital : la part convertie est comparée au capital net qu'elle aurait donné en sortie en capital, impôt calculé de la même manière.

## 4. Assurance vie (règles appliquées en phase 3)
- Primes versées depuis le 27/09/2017 : avant 8 ans, 12,8 % ; après 8 ans, 7,5 % sur la part des produits correspondant à 150 000 € de primes nettes, 12,8 % au-delà — officielle (Bercy infos).
- Primes versées avant le 27/09/2017 : prélèvement libératoire de 35 % (moins de 4 ans), 15 % (4 à 8 ans), 7,5 % (après 8 ans) — officielle (Bercy infos).
- Abattement annuel après 8 ans : 4 600 € (9 200 € pour un couple soumis à imposition commune), commun à tous les contrats, imputé d'abord sur les produits des primes antérieures au 27/09/2017 (CGI art. 125-0 A, cité par Kohen Avocats) — concordante.
- Seuil de 150 000 € : primes nettes de rachats, par assuré, tous contrats, au 31 décembre de l'année précédant le rachat — concordante.
- Prélèvements sociaux : 17,2 %, prélevés chaque année sur le fonds euros et régularisés au rachat — concordante.
- Frais du fonds euros : taux servi net = rendement après frais de gestion sur encours (fiches BPCE Life, Spirica) : soustraction des frais au rendement — concordante. L'anomalie C18 de l'audit (application multiplicative) n'est pas retenue.
- Assiette de l'impôt sur le revenu : produits = sommes remboursées − primes correspondantes (CGI art. 125-0 A), donc nets des prélèvements sociaux déjà prélevés — lecture littérale du texte, **à confirmer** au BOFiP (C23).
- Ordre de l'abattement (primes anciennes, puis 7,5 %, puis 12,8 %) : source unique concordante (Yomoni, Kohen Avocats pour les primes anciennes) — **à confirmer**.
- Prise en compte des primes anciennes dans le seuil de 150 000 € (fraction à 7,5 % = (150 000 − primes anciennes) ÷ primes récentes) : les sources divergent (Yomoni pour, Netbooster contre) — **à confirmer**.

**Hypothèses de modélisation de l'assurance vie (phase 3)**
- Les produits d'un rachat se répartissent entre primes anciennes et récentes au prorata des primes.
- Les primes des autres contrats saisies sont supposées versées depuis le 27/09/2017.
- Contrat existant : prélèvements sociaux déjà payés sur la part en fonds euros des plus-values latentes, au prorata de la répartition actuelle.
- L'abattement annuel n'est pas réduit par d'éventuels rachats sur d'autres contrats.

## 5. Livrets (règles appliquées en phase 4)
- Livret A, LDDS : intérêts par quinzaine, versement compté à partir de la quinzaine suivante, retrait dès le début de la quinzaine en cours, capitalisation au 31 décembre, exonération d'impôt et de prélèvements sociaux — concordante.
- Livret bancaire : la banque retient l'acompte de 12,8 % et les prélèvements sociaux lors de l'inscription des intérêts ; l'acompte s'impute sur l'impôt de l'année suivante ; dispense possible sous conditions de revenu ; option pour le barème globale avec CSG déductible — officielle (Bercy infos) et concordante.

**Hypothèses de modélisation des livrets (phase 4)**
- Intérêts, prélèvements sociaux et acompte arrondis au centime séparément, à l'inscription.
- Option barème : l'option est globale (tous les revenus de placement du foyer) ; le simulateur l'applique aux seuls intérêts du livret simulé. CSG déductible à 6,8 % (maintien malgré la hausse de la CSG **à confirmer**).
- La régularisation de l'impôt (paiement ou remboursement) est comptée l'année des intérêts, sans décalage d'un an.
