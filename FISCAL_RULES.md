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

### 1.3 Plafonnement du quotient familial — officielle
L'avantage des parts au-delà des parts de base est limité à 1 807 € par demi-part (revenus 2025).
Pour le parent isolé, les deux premières demi-parts supplémentaires sont plafonnées à 4 262 € (revenus 2025).
Source : brochure pratique IR 2026, « Calcul de l'impôt » (impots.gouv.fr, `ir_2026/21-calcul_impot_369a382.pdf`), qui donne aussi 1 807 € par demi-part et la décote.
Formule : impôt = max(impôt avec toutes les parts ; impôt avec les parts de base − plafond).

### 1.4 Décote — officielle
Décote = forfait − 45,25 % × impôt brut, si positive, sans dépasser l'impôt. Forfait : 897 € (personne seule), 1 483 € (couple soumis à imposition commune). Revenus 2025.
Source : Bercy infos « Pouvez-vous bénéficier de la décote » (17/04/2026), BOFiP BOI-IR-LIQ-20-20-30, brochure pratique IR 2026.

### 1.5 Impôt supplémentaire et économie d'une déduction — formule
- Impôt supplémentaire d'un revenu R' : impôt(R + R') − impôt(R).
- Économie d'une déduction D : impôt(R) − impôt(R − D).
Ces différences intègrent automatiquement les changements de tranche, le plafonnement et la décote. La TMI (tranche) n'est qu'une approximation, exacte seulement si le revenu reste dans la même tranche.

### 1.6 Système du quotient (CGI art. 163-0 A) — officielle (BOFiP cité)
Impôt d'un revenu exceptionnel E : coef × [impôt(R + E / coef) − impôt(R)], avec coef = 4. Le contribuable n'opte que si c'est favorable : le moteur retient le minimum entre l'imposition directe et le quotient.
Applicable à la part du capital PER issue de versements déduits, quel que soit son montant (BOFiP BOI-RSA-PENS-30-10-20, cité par Hagnéré Patrimoine et ERES).

### 1.7 Abattement de 10 % sur les pensions (CGI art. 158-5 a) — concordante
10 % des pensions, au minimum 454 € par pensionné (sans dépasser la pension), au maximum 4 439 € par foyer (revenus 2025).
- Le plancher s'apprécie **pour chaque pensionné**, le plafond pour le foyer : abattement du foyer = min(Σ min(pension, max(10 % × pension, 454 €)) ; 4 439 €).
- L'impôt supplémentaire d'une rente PER se calcule sur la hausse des pensions nettes imposables du foyer, la rente s'ajoutant aux pensions du titulaire (`taxablePensionIncrement`). Si le profil indique les pensions du conjoint, le plancher du conjoint n'est pas reporté sur la rente : avec une pension de 1 000 € (abattement 454 €) et une rente de 2 000 €, l'abattement du titulaire reste 454 € et toute la rente est imposable, alors qu'un calcul sur les pensions agrégées du foyer en abattrait 10 %.
Sources : Moneyvox, Goodvest, Toutsurmesfinances (concordantes). Une source isolée cite encore les montants des revenus 2024.

### 1.8 Contexte fiscal transmis aux placements — hypothèse
Le profil transmet aux colonnes : situation, enfants (dates de naissance, rattachement, invalidité), vie seule ou en concubinage, revenu net imposable du foyer pendant l'épargne, revenu imposable et pensions brutes à la retraite.
- Les revenus sont supposés **constants** (pas d'évolution des salaires ni de revalorisation du barème).
- Le barème des revenus 2025 est appliqué à toutes les années simulées (**hypothèse de stabilité des règles fiscales**).
- Sans contexte (profil incomplet ou TMI saisie à la main), le moteur applique une TMI fixe et signale les résultats comme **approximatifs**.

## 2. Prélèvements sociaux — officielle
- 18,6 % sur les revenus du capital depuis le 1er janvier 2026 (LFSS 2026), dont livrets bancaires et toutes les sorties de PER, en capital comme en rente (Service-Public A18841).
- 17,2 % pour l'assurance vie, exclue de la hausse (LFSS 2026 art. 12, cité par Défiscalisation France, Time2money ; **concordante**).
- CSG déductible de 6,8 % en cas d'option pour le barème, maintenue à ce taux malgré la hausse de la CSG — officielle (Service-Public F2329).

## 3. PER (règles appliquées en phase 2)
- Plafond de déduction des salariés : 10 % des revenus professionnels nets, plancher 4 710 €, maximum 37 680 € (PASS 2025) — concordante.
- Report des plafonds non utilisés : 3 ans pour ceux nés avant 2026, 5 ans pour ceux nés à partir de 2026 (LF 2026 art. 10 ; BOFiP du 10/08/2026 cité par Goodvest et Moneyvox) — officielle (citée).
- Imputation : plafond de l'année, puis reports du plus ancien au plus récent — officielle (citée).
- Mutualisation entre conjoints mariés ou pacsés (case 6QR, option annuelle) — officielle (citée). Elle cesse l'année suivant les 70 ans de l'un des conjoints (BOFiP cité par Harvest).
- Versements effectués à partir de 70 ans : non déductibles depuis le 1er janvier 2026 (LF 2026, loi n° 2026-103 du 19/02/2026, art. 9) — officielle (citée).
- Sortie en capital : part issue des versements déduits imposée au barème dans la catégorie des pensions, **sans abattement de 10 %**, éligible au système du quotient ; gains au PFU (12,8 % + 18,6 %) ; versements non déduits exonérés — officielle (BOFiP cité).
- Rente issue de versements déduits : barème après abattement de 10 % (plafonné, voir 1.7), prélèvements sociaux sur la fraction imposable selon l'âge ; issue de versements non déduits : rente viagère à titre onéreux, fraction imposable selon l'âge à l'entrée en jouissance (70 / 50 / 40 / 30 %, CGI art. 158-6) — concordante.
- Déblocage anticipé « résidence principale » : même fiscalité qu'une sortie en capital. « Accidents de la vie » : capital exonéré d'impôt sur le revenu, gains soumis aux seuls prélèvements sociaux — concordante.
- Déblocage l'année même du versement : les versements de l'année sont déduits du revenu de l'année entière. La part des versements de l'année qui sera déduite au 31 décembre (dans la limite du plafond de l'année, des reports et du plafond du conjoint) est traitée au retrait comme **issue de versements déduits** et imposée au barème ; elle ne peut pas sortir exonérée puis être déduite. Seuls les versements de l'année au-delà de la déduction disponible sortent comme non déduits. Exemple : 5 000 € versés, plafond 4 710 €, retrait de 2 500 € (la moitié) : 2 355 € imposés au barème, la déduction de l'année reste de 4 710 € — formule (conséquence de CGI art. 163 quatervicies et 158-5 b quinquies).
- Plafonds affichés sur l'avis d'impôt (plafond de l'année suivante et reports des années précédentes) : impots.gouv.fr, « Que signifie la somme imprimée dans la rubrique plafond épargne retraite ? » — officielle.
- Montant de la rente : table TGF05 à taux technique 0 %, prix d'un euro de rente selon l'âge (tarif du 1/1/2026, Guide de la taxe) — concordante ; projection pour une liquidation future : décalage d'âge selon la hausse de l'espérance de vie — **hypothèse**.

**Hypothèses de modélisation du PER (phase 2)**
- Les versements sont déductibles l'année de leur versement, dans l'ordre : plafond de l'année, reports du plus ancien au plus récent, plafond du conjoint. L'économie d'impôt est comptée au 31 décembre de l'année (elle réduit en réalité l'impôt payé l'année suivante).
- Le plafond annuel est supposé constant pendant toute la phase d'épargne.
- Mutualisation : l'âge du conjoint n'étant pas connu, elle s'arrête l'année suivant les 70 ans du titulaire.
- Pensions du foyer à la retraite non renseignées : l'abattement de 10 % s'applique à la rente sans plancher (le plancher est supposé absorbé par les autres pensions), dans la limite du plafond du foyer.
- Pensions du conjoint non renseignées (couple) : toutes les pensions du foyer sont attribuées au titulaire, ce qui ne compte qu'un plancher de 454 € ; l'abattement peut être légèrement surestimé si le titulaire a une petite pension.
- Sortie mixte : la part en capital et la première année de rente sont imposées séparément, chacune par rapport au revenu imposable à la retraite (l'interaction des deux la même année n'est pas cumulée).
- Comparaison rente / capital : la part convertie est comparée au capital net qu'elle aurait donné en sortie en capital, impôt calculé de la même manière.

## 4. Assurance vie (règles appliquées en phase 3)
- Primes versées depuis le 27/09/2017 : avant 8 ans, 12,8 % ; après 8 ans, 7,5 % sur la part des produits correspondant à 150 000 € de primes nettes, 12,8 % au-delà — officielle (Bercy infos).
- Primes versées avant le 27/09/2017 : prélèvement libératoire de 35 % (moins de 4 ans), 15 % (4 à 8 ans), 7,5 % (après 8 ans) — officielle (Bercy infos).
- Abattement annuel après 8 ans : 4 600 € (9 200 € pour un couple soumis à imposition commune), commun à tous les contrats, imputé d'abord sur les produits des primes antérieures au 27/09/2017, puis sur ceux taxés à 7,5 %, enfin sur ceux taxés à 12,8 % — officielle (CGI art. 125-0 A I 1°, Légifrance LEGIARTI000044989424).
- Seuil de 150 000 € : primes nettes de rachats, par assuré, tous contrats, au 31 décembre de l'année précédant le rachat, **primes antérieures au 27/09/2017 comprises** : fraction à 7,5 % des produits des primes récentes = (150 000 − primes anciennes) ÷ primes récentes, bornée entre 0 et 1 — officielle (BOFiP BOI-RPPM-RCM-20-15-20210621, §140 à 230).
- Rachat partiel d'un contrat en perte (valeur inférieure aux primes non remboursées) : la quote-part de primes remboursée est plafonnée au montant racheté ; le produit est nul et les primes restantes ne baissent que du montant racheté. Exemple : valeur 8 000 €, primes 10 000 €, rachat de 4 000 € : primes restantes 6 000 € (et non 5 000 €) — officielle (BOFiP BOI-RPPM-RCM-20-10-20-50, §80 à 100, reprenant la réponse RES n° 2010/46).
- Prélèvements sociaux : 17,2 %, prélevés chaque année sur le fonds euros et régularisés au rachat — concordante.
- Frais du fonds euros : taux servi net = rendement après frais de gestion sur encours (fiches BPCE Life, Spirica) : soustraction des frais au rendement — concordante. L'anomalie C18 de l'audit (application multiplicative) n'est pas retenue.
- Assiette de l'impôt sur le revenu : produits = sommes remboursées − primes correspondantes (CGI art. 125-0 A), donc nets des prélèvements sociaux déjà prélevés — lecture littérale du texte, **à confirmer** au BOFiP (C23).

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
- Option barème : l'option est globale (tous les revenus de placement du foyer) ; le simulateur l'applique aux seuls intérêts du livret simulé. CSG déductible à 6,8 % (Service-Public F2329).
- La régularisation de l'impôt (paiement ou remboursement) est comptée l'année des intérêts, sans décalage d'un an.

## 6. Limites numériques du TRI (`src/engine/core/irr.ts`)
Le TRI est la racine de la valeur actuelle des flux mensuels. Le moteur évalue cette valeur actuelle sur une grille de taux mensuels et compte les changements de signe : un seul donne un TRI unique, plusieurs signalent des TRI multiples (le TRI n'est alors pas affiché), aucun donne un TRI indéterminé.
- Bornes : −50 % à +50 % par mois (environ −100 % à +12 900 % par an). Un TRI hors de ces bornes n'est pas trouvé.
- Pas fin de 0,01 point par mois (environ 0,12 point par an) entre −2 % et +5 % par mois (environ −21,5 % à +79,6 % par an), la plage des placements réalistes ; pas de 0,25 point par mois ailleurs.
- Deux TRI plus proches que le pas local tombent dans le même intervalle : la valeur actuelle ne change pas de signe entre deux points de grille et **aucun TRI n'est signalé** (statut « indéterminé », jamais un TRI faux). Exemples testés : 1,01 % et 1,09 % par mois sont détectés comme multiples ; 1,002 % et 1,008 % ne le sont pas ; 21,01 % et 21,11 % non plus.
- Une racine double (valeur actuelle tangente à zéro, sans changement de signe) n'est pas détectée.
- Ces cas supposent des flux qui changent plusieurs fois de signe (versements et rachats mêlés) ; pour un placement classique (versements puis retraits), le TRI est unique.

## 7. Valeur actualisée et horizons différents — hypothèse de lecture
Le gain en euros d'aujourd'hui (flux actualisés à l'inflation) ne suffit pas à comparer des placements de durées différentes : il ne dit rien de ce que deviendrait l'argent après la fin du placement le plus court, ni de la disponibilité des fonds et du risque. Le comparateur le signale et recommande de simuler les placements sur une même durée.

## Points restant à confirmer
- Assiette de l'impôt sur le revenu des rachats d'assurance vie : produits nets ou bruts des prélèvements sociaux annuels déjà prélevés sur le fonds euros (§4, C23).
