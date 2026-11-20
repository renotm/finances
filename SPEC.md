# Simulateur de placements — Spécification v1

> Statut : v1 livrée. Évolutions PER, report des plafonds, profils et TMI livrés. **Fiabilisation fonctionnelle et financière** (AUDIT_PLAN.md) : réalisée sur la branche `fiabilisation`, voir AUDIT_REMEDIATION.md et FISCAL_RULES.md.
> Dernière mise à jour : 20/11/2026

---

## 1. Objectif

Une page web qui simule l'évolution d'un placement financier dans le temps et permet de **comparer jusqu'à 3 placements** côte à côte.

- Placements v1 : **Livret A**, **LDDS**, **livret bancaire type Bourso+**, **assurance vie**, **PER**.
- L'architecture doit permettre d'en ajouter facilement ensuite (PEA, CTO, LEP…).
- Tous les paramètres ont une **valeur par défaut** (fichier de config) et sont **modifiables** par l'utilisateur.
- Simulation **indicative** : fiscalité française, taux moyens, pas de conseil en investissement.

## 2. Contraintes techniques

| Sujet | Choix |
|---|---|
| Type de site | 100 % statique après build : pas de serveur applicatif, pas de base de données, pas d'authentification |
| Persistance | Profils seulement, dans le stockage du navigateur (localStorage), voir 5.5 |
| Stack | Vite + Vue 3 + TypeScript |
| Graphiques | Chart.js, utilisé directement (le paquet vue-chartjs 5.3.6 publié sur npm est incomplet) |
| Traductions | vue-i18n, FR (par défaut) et EN |
| Tests | Vitest, centrés sur le moteur de calcul |
| Node | 24.x |
| Hébergement | GitHub Pages via une GitHub Action ; le dossier `dist/` reste déployable sur n'importe quel hébergeur statique (chemins relatifs) |
| Responsive | Utilisable sur mobile, optimisé pour desktop |

## 3. Principes généraux de simulation

### 3.1 Repère temporel
- L'utilisateur saisit un **mois et une année de début** et une **durée en années**.
- La simulation avance **mois par mois**.
- **Versements périodiques** : mensuels ou annuels (au choix selon le placement). Un versement mensuel est considéré comme crédité **le 1er du mois**.
- **Mouvements ponctuels** (versements exceptionnels, retraits) : un montant à un mois donné.

### 3.2 Taux
- Un **taux moyen annuel** unique sur toute la durée, par support.
- Pas de taux variable par période en v1.

### 3.3 Risque
- Les supports **sans risque** (livrets, fonds euros) n'ont qu'une courbe.
- Les supports **risqués** (unités de compte, plus tard PEA/CTO) ont un **profil de risque** : prudent / équilibré / dynamique.
- Chaque profil définit (dans la config) un rendement moyen par défaut et un **écart** qui donne une fourchette basse / haute.
- Le graphique affiche la courbe moyenne et une **zone** entre scénario bas et scénario haut.

### 3.4 Brut / net
- **Brut** : valeur du placement (après frais de gestion, avant impôts et prélèvements sociaux dus à la sortie).
- **Net** : ce que l'utilisateur toucherait s'il **retirait tout à la fin de la simulation**, après frais, impôts et prélèvements sociaux. Pour le PER, le net **inclut l'économie d'impôt** obtenue à l'entrée et, en sortie rente ou mixte, le total des rentes nettes perçues jusqu'à l'âge de fin de simulation (voir 4.4).
- Un **interrupteur Brut / Net** bascule tout l'affichage (synthèse, graphique, tableau).

### 3.5 Inflation
- Le moteur calcule en euros courants. L'inflation sert aux indicateurs de comparaison (3.6), sans modifier les calculs des placements.

### 3.6 Comparaison des placements
- **Inflation supposée** (2 % par défaut), saisie au-dessus de la synthèse.
- **Rendement annuel (TRI)** : la valeur actuelle des flux est examinée sur une grille de taux ; un seul changement de signe donne un TRI unique ; plusieurs changements signalent des TRI multiples, affichés « non pertinent » ; aucun : « non calculable ».
- **Rendement réel** = (1 + rendement nominal) ÷ (1 + inflation) − 1.
- **Gain net en euros d'aujourd'hui** : somme des flux de l'épargnant (versements négatifs ; retraits, rentes, économies d'impôt, valeur finale positifs), actualisés à l'inflation. Il corrige l'effet de l'inflation mais **ne suffit pas** à comparer des placements d'horizons différents : il ignore ce que deviendrait l'argent après la fin du placement le plus court, la disponibilité des fonds et le risque. Quand les durées diffèrent, une note le signale et recommande de simuler les placements sur une même durée.
- **Limites numériques du TRI** : grille de −50 % à +50 % par mois, pas fin de 0,01 point par mois entre −2 % et +5 % par mois, 0,25 point ailleurs. Deux TRI plus proches que le pas local, ou une racine double, ne sont pas détectés : le TRI est alors « non calculable », jamais faux (FISCAL_RULES.md §6).
- **Effort d'épargne** = versements − économies d'impôt réinvesties. Une note signale des efforts différents entre colonnes.
- **Horizon** : une note signale des durées différentes (le PER en rente dure jusqu'à l'âge de fin).
- **Économies d'impôt** : affichées à part ; la synthèse distingue le **capital disponible** (hors économies conservées). Option PER « Réinvestir les économies d'impôt » : l'économie est versée le mois suivant ; elle n'est alors plus ajoutée à la valeur nette (pas de double comptage).
- **Fourchettes** des unités de compte : hypothèses de rendement, pas des probabilités (note sous le graphique).
- **Stabilité des règles** : le barème et les règles fiscales de 2026 sont supposés stables, et les revenus constants (mention en pied de page).

## 4. Placements

Les valeurs chiffrées par défaut sont dans le fichier de config. Elles ont été vérifiées le 20/11/2026 ; les taux et barèmes évoluent, voir §9.

### 4.1 Livret A et LDDS

**Paramètres**
| Paramètre | Défaut |
|---|---|
| Capital initial | 1 000 € (valeur commune à tous les placements, dans la config) |
| Versement périodique + fréquence | 100 € / mensuel ; 10 ans de durée |
| Mouvements ponctuels | aucun |
| Taux annuel | 1,7 % (identique pour les deux, en vigueur depuis le 01/08/2026, prochaine révision le 01/02/2027) |
| Plafond de versements | 22 950 € (Livret A), 12 000 € (LDDS) |

**Règles**
- **Intérêts par quinzaines** : l'année compte 24 quinzaines (du 1er au 15, du 16 à la fin du mois). Intérêts = somme sur les quinzaines de (solde de la quinzaine × taux / 24).
  - Un versement porte intérêt à partir de la quinzaine qui suit : un versement du 1er rapporte à partir du 16 (règle stricte).
  - Un retrait cesse de porter intérêt dès le début de la quinzaine où il a lieu : un retrait du 1er ne rapporte plus rien dès le 1er.
  - Si la simulation se termine en cours d'année, les intérêts courus sont versés à la clôture.
- Les intérêts sont **arrondis au centime, crédités et capitalisés au 31 décembre**. Les intérêts capitalisés peuvent faire dépasser le plafond (c'est légal).
- **Plafond** : un versement qui ferait dépasser le plafond est **réduit ou bloqué**, avec un message. Un **capital initial supérieur au plafond est autorisé** (cas d'un livret existant) ; dans ce cas aucun versement n'est accepté tant que le solde dépasse le plafond.
- **Fiscalité** : aucune (intérêts exonérés d'impôt et de prélèvements sociaux). Brut = net.

### 4.2 Livret bancaire type Bourso+

**Paramètres**
| Paramètre | Défaut |
|---|---|
| Capital initial, versements, mouvements ponctuels | comme 4.1 |
| Taux de base annuel brut | 1,5 % (fixé librement par la banque, modifiable à tout moment) |
| Taux boosté annuel brut | 0 % = pas de boost (ex. : offre Metal ou promotion de bienvenue, taux variable selon l'offre) |
| Durée du boost | 0 mois (0 avec un taux boosté renseigné = boost permanent) |
| Plafond du boost (montant max rémunéré au taux boosté) | 0 = sans limite |
| Plafond du livret | 0 = sans plafond (cas du Bourso+) |
| Fiscalité | flat tax ou barème |
| TMI (si barème) | 30 % |

**Règles**
- Intérêts par quinzaines, capitalisés au 31 décembre, comme 4.1.
- Pendant la durée du boost, la part du solde sous le plafond du boost est rémunérée au taux boosté, le reste au taux de base.
- **Fiscalité** : à l'inscription des intérêts (31 décembre), la banque **retient** les prélèvements sociaux (18,6 %) et l'acompte d'impôt de 12,8 % ; seuls les intérêts nets sont capitalisés.
  - PFU : l'acompte vaut l'impôt définitif (31,4 % au total) ;
  - **dispense d'acompte** (case à cocher, sous condition de revenu fiscal de référence) : seuls les prélèvements sociaux sont retenus, l'impôt est payé à part ;
  - **option barème** : impôt définitif = impôt supplémentaire au barème (avec le contexte fiscal du profil, décote comprise ; sinon TMI, approximation signalée) moins l'économie due à la CSG déductible (6,8 % des intérêts) ; la différence avec l'acompte est payée ou remboursée hors du livret.
- **Vue brute** : solde réel du livret (intérêts nets des retenues). **Vue nette** : solde réel moins les régularisations d'impôt payées à part (plus les remboursements). La ligne « Intérêts » de la synthèse reste celle des intérêts bruts.
- La régularisation est comptée au 31 décembre de l'année des intérêts (en réalité l'année suivante).

### 4.3 Assurance vie

**Paramètres**
| Paramètre | Défaut |
|---|---|
| Capital initial, versements, mouvements ponctuels | 0 € |
| Contrat déjà ouvert + date d'ouverture | non ; si oui, la date d'ouverture sert à la règle des 8 ans, et le capital initial (valeur actuelle) ne supporte pas de frais sur versement |
| Contrat existant : total des versements nets restant, dont versements avant le 27/09/2017 | 0 = inconnu (plus-values latentes ignorées, avertissement) |
| Versements nets sur les autres contrats d'assurance vie de l'assuré | 0 € (seuil de 150 000 €) |
| Frais sur versements | 0 % (contrats en ligne) |
| Répartition fonds euros / UC | 100 % / 0 % |
| Taux fonds euros (brut de frais) | 3,2 % (soit 2,6 % net de frais, la moyenne du marché en 2025) |
| Frais de gestion fonds euros | 0,6 %/an (contrats en ligne : 0,5 à 0,6 % ; moyenne du marché : 0,67 %) |
| Profil de risque UC | équilibré |
| Rendement moyen UC | selon profil (voir 4.5) |
| Frais de gestion UC | 0,6 %/an |
| Situation | célibataire / couple |
| Prélèvements sociaux | 17,2 % (l'assurance vie est exclue de la hausse 2026) |

**Règles de calcul**
- Frais sur versements prélevés à chaque versement.
- Fonds euros : intérêts nets de frais de gestion crédités au 31 décembre ; **prélèvements sociaux prélevés chaque année** sur ces intérêts.
- UC : valorisation mensuelle au rendement moyen (moins frais de gestion), prélèvements sociaux **à la sortie** seulement.
- Pas d'arbitrage ni de rééquilibrage en v1 : la répartition s'applique à chaque versement.

- **Frais du fonds euros** : taux servi = rendement brut − frais de gestion sur encours (définition des fiches de rendement des assureurs) ; les unités de compte supportent les frais mois par mois sur l'encours. Aucune double déduction : les frais ne sont prélevés qu'une fois, sur l'encours.

**Fiscalité des rachats** (partiels en cours de route, total en fin de simulation pour le net), CGI art. 125-0 A
- **Produits** d'un rachat = montant racheté − primes × (montant racheté ÷ valeur du contrat). Cette assiette de l'impôt sur le revenu est nette des prélèvements sociaux déjà prélevés sur le fonds euros.
- **Contrat en perte** (valeur inférieure aux primes restantes) : le produit d'un rachat partiel est nul et les primes restantes ne baissent que du **montant racheté** (BOFiP BOI-RPPM-RCM-20-10-20-50 §100) ; exemple : valeur 8 000 €, primes 10 000 €, rachat de 4 000 € → primes restantes 6 000 €.
- Les produits se répartissent entre primes versées **avant** et **depuis** le 27/09/2017 au prorata des primes.
- **Avant 8 ans** : primes récentes 12,8 % ; primes anciennes 35 % (moins de 4 ans) ou 15 % (4 à 8 ans).
- **Après 8 ans** :
  - abattement annuel de 4 600 € (célibataire) / 9 200 € (couple), consommé une seule fois par an même en cas de rachats multiples, imputé **d'abord** sur les produits des primes anciennes, **puis** sur ceux taxés à 7,5 %, **puis** sur ceux taxés à 12,8 % ;
  - primes anciennes : 7,5 % ; primes récentes : 7,5 % sur la fraction (150 000 € − primes anciennes) ÷ primes récentes, 12,8 % au-delà, les primes étant celles de **tous les contrats de l'assuré au 31 décembre de l'année précédente** ;
  - prélèvements sociaux (non concernés par l'abattement) : sur les produits avant prélèvements annuels, moins ceux déjà payés.
- **Contrat existant** : les primes saisies déterminent les plus-values latentes ; les prélèvements sociaux de leur part en fonds euros sont supposés déjà payés, au prorata de la répartition actuelle.
- Hors périmètre : versements après 70 ans, succession, option pour le barème, abattement consommé par des rachats sur d'autres contrats.

### 4.4 PER

**Paramètres**
| Paramètre | Défaut |
|---|---|
| Âge actuel | 40 ans |
| Âge de départ à la retraite | 64 ans |
| Versement initial (libellé du capital initial pour le PER), versements, mouvements ponctuels | 0 € |
| Versements déduits du revenu imposable | oui |
| TMI actuelle | 30 % |
| TMI à la retraite | 11 % |
| Revenus professionnels annuels nets (pour le plafond de déduction) | optionnel |
| Frais sur versements, frais de gestion | 0 % ; 0,6 %/an |
| Répartition fonds euros / UC + profil de risque | comme 4.3 |
| Mode de sortie | capital / rente / mixte (% en capital) |
| Prélèvements sociaux sur les gains | 18,6 % (taux 2026, applicable à toutes les sorties de PER selon Service-Public) |
| Plafond saisi depuis l'avis d'impôt | case « Saisir le plafond » ; un plafond **nul** est accepté |
| Plafond du conjoint (mutualisation, case 6QR) | 0 € |
| Contexte fiscal (`taxContext`) | transmis par le profil : situation, enfants, revenus pendant l'épargne et à la retraite, pensions (voir 4.7) |

**Paramètres de la rente** (visibles dans les paramètres principaux dès que la sortie n'est pas « Capital »)
| Paramètre | Défaut |
|---|---|
| Méthode de calcul | table TGF05 (estimation) / taux de conversion du contrat |
| Table de mortalité garantie à la souscription | non |
| Hausse de l'espérance de vie (décalage d'âge si la table n'est pas garantie) | +1 an par décennie (tendance INSEE 2000-2025) |
| Frais sur arrérages | 2 % de chaque rente |
| Taux de conversion (méthode « taux de conversion ») | 3,5 % du capital par an (fourchette constatée à 64 ans : 3,1 à 4,3 %) |
| Durée de vie supposée (horizon d'affichage) | 86 ans (moyenne hommes/femmes INSEE 2025) |
| Âge de fin de simulation | 0 = durée de vie supposée |

**Règles**
- La durée de la simulation est l'âge de départ moins l'âge actuel (calculée, pas saisie).
- **Retraits interdits avant la retraite**, sauf **déblocages anticipés** (mouvements ponctuels) : « résidence principale » ou « accident de la vie ».
- **Économie d'impôt à l'entrée** (si versements déduits) : avec un contexte fiscal, **impôt(revenu) − impôt(revenu − déduction)** l'année du versement (barème, quotient familial, décote, composition du foyer de l'année) ; sans contexte, déduction × TMI, signalée comme approximative. Le versement initial compte comme un versement de la première année.
- **Versements à partir de 70 ans** : non déductibles depuis 2026 (LF 2026 art. 9), avec un avertissement.
- **Déblocage anticipé** : la déduction des versements de l'année n'est pas réduite. « Résidence principale » : imposé comme une sortie en capital (barème avec système du quotient sur les versements déduits, PFU sur les gains), avec les revenus actuels. « Accident de la vie » : capital exonéré d'impôt sur le revenu, gains soumis aux seuls prélèvements sociaux.
  - **Déblocage l'année du versement** : la part des versements de l'année qui sera déduite au 31 décembre est traitée comme issue de versements déduits et imposée au barème lors d'un déblocage « résidence principale » ; seuls les versements au-delà de la déduction disponible sortent comme non déduits. Exemple : 5 000 € versés en mars, plafond 4 710 €, déblocage de 2 500 € en juin → 2 355 € imposés (706,50 € à 30 %), déduction de l'année 4 710 €.
- **Plafond de déduction** (salariés) : 10 % des revenus professionnels nets, avec un plancher de 4 710 € et un plafond de 37 680 € (valeurs 2026, calculées sur le PASS 2025 de 47 100 €). Sans revenus renseignés, on applique le plancher. Un **avertissement** s'affiche si les versements de l'année dépassent le plafond ; la part au-delà ne génère pas d'économie d'impôt. Le plafond figurant sur l'avis d'imposition est le chiffre qui fait foi : un champ permet de le saisir directement.
- Report des plafonds non utilisés des années précédentes : voir 4.4.4.
- **Mutualisation** : le plafond du conjoint (saisi, par an) s'impute après le plafond de l'année et les reports ; plus utilisée à partir de l'année suivant les 70 ans du titulaire (l'âge du conjoint n'est pas connu).
- Hors périmètre : plafonds des indépendants (TNS).
- **Sortie en capital** :
  - versements déduits : impôt sur le revenu dans la catégorie des pensions, **sans abattement de 10 %**, au barème avec le **système du quotient** (minimum entre imposition directe et quotient), avec le revenu imposable du foyer à la retraite ; sans ce revenu, TMI à la retraite (approximation signalée) ; pas de prélèvements sociaux ;
  - gains : flat tax (12,8 % + prélèvements sociaux) ;
  - versements non déduits : exonérés, seuls les gains sont imposés.
- **Sortie en rente** : voir 4.4.1 (calcul) et 4.4.2 (phase de versement).
- **Fiscalité de la rente** :
  - versements déduits : rente imposée comme une pension, après abattement de 10 % **plafonné** compte tenu des pensions du foyer : plancher de 454 € **par pensionné**, plafond de 4 439 € par foyer ; la rente s'ajoute aux pensions du titulaire, celles du conjoint gardent leur propre abattement (sans pensions renseignées : 10 % sans plancher, limité au plafond ; sans pensions du conjoint : toutes les pensions sont attribuées au titulaire) ; prélèvements sociaux sur la fraction imposable selon l'âge ;
  - versements non déduits : rente viagère à titre onéreux, seule une fraction est imposée ;
  - fraction imposable selon l'âge **révolu** à l'entrée en jouissance : 70 % avant 50 ans, 50 % de 50 à 59 ans, 40 % de 60 à 69 ans, 30 % à 70 ans et plus ;
  - impôt calculé au barème (impôt supplémentaire sur le revenu à la retraite) si le contexte fiscal est complet, sinon à la TMI à la retraite (approximation signalée).
- **Net du PER** = capital net perçu à la retraite + total des rentes nettes perçues jusqu'à l'âge de fin de simulation + économies d'impôt cumulées à l'entrée.

#### 4.4.1 Calcul de la rente

Les assureurs calculent la rente avec une **table de mortalité réglementaire** (TGF05, unisexe). L'espérance de vie progresse (à 60 ans : de 20,4 à 23,9 ans pour les hommes et de 25,6 à 27,9 ans pour les femmes entre 2000 et 2025, source INSEE), et les tables sont révisées en conséquence. Selon le contrat, la rente est calculée avec :
- la **table en vigueur à la souscription**, si le contrat la garantit : les révisions ultérieures ne s'appliquent pas, ce qui est plus favorable ;
- la **table en vigueur à la liquidation** sinon : la rente baisse si l'espérance de vie a augmenté entre-temps.

**Méthode « table TGF05 »** (corrige l'anomalie C39 de l'audit, qui surestimait la rente de 10 à 50 %) :
- rente annuelle = capital converti ÷ **prix d'un euro de rente** × (1 − frais sur arrérages), avec le prix publié pour la table TGF05 à taux technique 0 % (tarif du 1/1/2026, âges 55 à 80, interpolé entre deux âges entiers ; hors table, prix de l'âge le plus proche avec un avertissement). À 64 ans : 31,7745, soit 3,15 % du capital par an, dans la fourchette du marché ;
- table non garantie : les tables appliquées à une liquidation future refléteront la hausse de l'espérance de vie, modélisée par un **décalage d'âge** (âge de la table = âge de départ − hausse × années jusqu'à la retraite), hypothèse ;
- la rente affichée est une **estimation non contractuelle** ; la synthèse le précise, ainsi que le prix et l'âge de table retenus, et la rente qu'on aurait eue avec une table garantie.

**Comparaison avec le capital** : la synthèse affiche le capital **net d'impôt** qu'aurait donné la même part en sortie en capital, et l'âge à partir duquel les rentes nettes cumulées le dépassent.

**Méthode « taux de conversion »** (devis d'assureur) :
- rente annuelle = capital converti × taux de conversion × (1 − frais sur arrérages).

**L'espérance de vie ne sert qu'au calcul du montant.** La rente est viagère : elle est versée jusqu'au décès, quelle que soit sa date. Si l'on vit plus longtemps que prévu, l'assureur continue de payer ; si l'on décède avant, il garde le capital (mutualisation).

La rente est **fixe** (même montant chaque année). Le capital converti est la part du capital non versée en capital (100 % en sortie rente, 100 % − part en capital en sortie mixte).

#### 4.4.2 Phase de versement

La simulation continue après la retraite, **jusqu'à l'âge de fin de simulation**, une hypothèse de durée de vie indépendante du calcul de la rente. Par défaut, c'est la durée de vie supposée (86 ans) ; l'utilisateur peut saisir un autre âge pour voir le cas d'une vie plus courte ou plus longue. L'impôt sur la rente est recalculé chaque année avec la composition du foyer de l'année.
- Rentes versées chaque mois (1/12 de la rente annuelle), imposées selon les règles ci-dessus.
- **Graphique** : après la retraite, la courbe du PER montre le **cumul perçu**, qui augmente au fil des rentes : en vue brute, capital versé à la retraite + rentes brutes cumulées ; en vue nette, capital net + rentes nettes cumulées + économies d'impôt. On n'affiche pas de « capital restant », qui tomberait à 0 à l'espérance de vie alors que la rente continue. La courbe chute donc à la retraite (le capital converti est cédé à l'assureur) : une note sous le graphique l'explique.
- **Tableau** : pour les années de versement, colonnes rente brute, impôts et prélèvements, rente nette, cumul brut, cumul net.
- **Synthèse** : 1re rente annuelle et mensuelle, brute et nette ; durée retenue pour le calcul ; total des rentes nettes perçues à l'âge de fin ; **âge à partir duquel les rentes nettes cumulées dépassent le capital converti** (le seuil au-delà duquel la rente a rapporté plus que le capital) ; un avertissement si l'âge de fin est inférieur à l'âge de départ.
- **Sortie en capital** : pas de phase de versement, mais la carte indique à titre de comparaison la rente mensuelle nette qu'aurait donnée une sortie en rente.
- Le rendement annuel net (TRI) intègre les rentes perçues.

#### 4.4.3 Bouton « verser le maximum déductible »

- Affiché quand « Versements déduits du revenu imposable » est coché, sous la forme d'un **petit bouton « Max »** placé sur la ligne du libellé « Versement régulier », à droite, pour ne pas alourdir le formulaire.
- Sous le champ, une ligne d'aide indique ce qu'il donnera : « Max déductible : 392 €/mois (plafond de 4 710 €/an) ».
- Plafond utilisé : celui de l'avis d'impôt s'il est saisi, sinon 10 % des revenus professionnels bornés (4 710 € à 37 680 €), sinon le plancher de 4 710 €.
- Un clic remplit le champ « Versement régulier » : plafond ÷ 12 arrondi à l'euro inférieur en mensuel, plafond entier en annuel. Le champ reste modifiable et ne se recalcule pas tout seul si les revenus changent.
- Le capital initial n'est pas déduit du plafond de la 1re année : s'il le fait dépasser, l'avertissement habituel s'affiche.
- Le bouton ne tient compte que du **plafond de l'année** : les plafonds reportés sont consommés une seule fois et ne se lissent pas en versement mensuel ; ils passent par le versement initial (voir 4.4.4).

#### 4.4.4 Report des plafonds non utilisés

**La règle fiscale**
- Chaque année, tout contribuable ayant des revenus professionnels dispose d'un plafond de déduction, qu'il ait un PER ou non.
- La part non utilisée d'un plafond est **reportable** sur les années suivantes : **3 ans** pour les plafonds des années 2025 et antérieures, **5 ans** pour ceux nés à partir de 2026 (loi de finances 2026). Exemple : le plafond 2023 non utilisé expire fin 2026, le plafond 2026 non utilisé reste mobilisable jusqu'en 2031.
- Les versements d'une année s'imputent **d'abord sur le plafond de l'année**, puis sur les plafonds reportés, **en commençant par le plus ancien**.
- L'avis d'imposition (rubrique « Plafond épargne retraite ») détaille le plafond de l'année et les plafonds non utilisés des années précédentes, par année d'origine.

**Paramètres** (visibles si les versements sont déduits, dans les paramètres avancés)
| Paramètre | Défaut |
|---|---|
| Plafond annuel (avis d'impôt), **hors report** | 0 = calculé à partir des revenus (10 %, de 4 710 € à 37 680 €), sinon le plancher. Remplace le champ actuel « Plafond de déduction (avis d'impôt) », dont l'aide précise désormais qu'il ne faut pas y inclure les plafonds non utilisés |
| Plafonds non utilisés des années N−1 à N−5 | 0 € |

- N est l'année de la date de début ; les libellés affichent les vraies années (exemple pour un début en 2026 : « non utilisé en 2025 », « en 2024 », « en 2023 »).
- Seuls les champs encore utilisables à la date de début s'affichent : N−1 à N−3 jusqu'en 2029, N−4 à partir de 2030 (plafond 2026), N−5 à partir de 2031 (BOFiP : report « en avant » sur 5 ans pour les plafonds nés à partir de 2026).
- Un petit bouton **« Estimer »**, sur la ligne du premier de ces trois champs, les remplit avec le plafond annuel courant, pour le cas fréquent de quelqu'un qui n'a jamais versé sur un PER. L'aide indique que l'avis d'impôt fait foi.

**Calcul, chaque année civile de la phase d'épargne**
1. Plafond disponible = plafond de l'année + plafonds reportés encore valides.
2. Les versements de l'année consomment d'abord le plafond de l'année, puis les reports du plus ancien au plus récent.
3. La part non utilisée du plafond de l'année devient un report, valable 5 ans (règle 2026).
4. Les reports arrivés à expiration disparaissent.
5. La part des versements au-delà du plafond disponible n'est pas déduite (règle actuelle, avec son avertissement).
- Le plafond annuel est supposé constant sur toute la durée (pas d'indexation sur le PASS), comme aujourd'hui.

**Versement initial et bouton « Utiliser le report »**
- Pour le PER, le champ « Capital initial » s'appelle **« Versement initial »** : c'est un versement de la 1re année, déductible dans la limite du plafond disponible (le calcul ne change pas). Les autres placements gardent « Capital initial ».
- Petit bouton **« Utiliser le report »** sur la ligne du libellé « Versement initial », visible si les versements sont déduits et si des plafonds non utilisés sont saisis.
- Un clic **remplace** la valeur du versement initial par le **maximum déductible la 1re année** : plafond de l'année + total des plafonds non utilisés saisis − versements réguliers et ponctuels déjà prévus la 1re année, arrondi à l'euro inférieur, minimum 0. Le champ reste modifiable ; recliquer redonne le même montant.
- Ligne d'aide : « Max déductible la 1re année : 13 930 € (dont 9 420 € de report) ». Exemple : début en novembre 2026, 100 €/mois, plafond de 4 710 €, 9 420 € de report : 4 710 + 9 420 − 200 = 13 930 €.

**Affichage**
- Carte du PER : une ligne « Plafonds reportés utilisés » avec le montant total, si elle n'est pas nulle.
- Un avertissement si des plafonds non utilisés **saisis par l'utilisateur** expirent sans avoir servi, avec le montant perdu. Les plafonds de l'année non utilisés pendant la simulation ne déclenchent pas d'avertissement : pour un épargnant qui verse moins que son plafond, il se répéterait chaque année sans rien apprendre.
- L'avertissement de dépassement compare désormais les versements au plafond disponible, report compris.

**Hors périmètre** : plafonds des indépendants (TNS). La mutualisation dans le couple est traitée en 4.4.

### 4.5 Profils de risque des unités de compte (hypothèses, modifiables)

Ces valeurs ne sont pas des données de marché officielles : ce sont des hypothèses de travail, à ajuster dans la config.

| Profil | Rendement moyen annuel (brut de frais) | Écart pour la fourchette basse / haute |
|---|---|---|
| Prudent | 3 % | ± 2 points |
| Équilibré | 5 % | ± 4 points |
| Dynamique | 7 % | ± 6 points |

### 4.6 Prélèvements sociaux : attention, plusieurs taux

Depuis le 1er janvier 2026 (LFSS 2026, +1,4 point de CSG), les revenus du capital supportent **18,6 %** de prélèvements sociaux, mais certains produits restent à **17,2 %**. Le taux est donc un **paramètre propre à chaque placement** dans la config, et non une constante globale :

| Placement | Taux par défaut |
|---|---|
| Livret A, LDDS | exonérés |
| Livret bancaire | 18,6 % |
| Assurance vie | 17,2 % |
| PER | 18,6 % (paramétrable, voir 4.4) |

### 4.7 Calcul de la TMI (à partir d'un profil, voir 5.5)

La TMI (taux marginal d'imposition) est calculée à partir du **revenu net imposable du foyer** et du **nombre de parts**, avec le barème dans le fichier de config.

**Barème 2026 (revenus 2025), par part**
| Tranche du quotient familial | Taux |
|---|---|
| jusqu'à 11 600 € | 0 % |
| de 11 601 € à 29 579 € | 11 % |
| de 29 580 € à 84 577 € | 30 % |
| de 84 578 € à 181 917 € | 41 % |
| au-delà de 181 917 € | 45 % |

**Nombre de parts, pour une année donnée**
- Parts de base : 1 pour une personne célibataire, divorcée ou veuve sans enfant à charge ; 2 pour un couple marié ou pacsé, et pour une personne veuve avec enfant(s) à charge.
- Enfants à charge **cette année-là** : 0,5 part pour chacun des deux premiers, 1 part à partir du troisième. Le rang suit l'ordre de naissance parmi les enfants encore à charge.
- Parent isolé (célibataire ou divorcé avec enfant(s) à charge, supposé en assumer seul la charge) : 0,5 part de plus (case T).

**Enfant à charge pour les revenus de l'année Y**
- né au plus tard en décembre de Y (un enfant né dans l'année compte) ;
- et âgé de **moins de 18 ans au 1er janvier de Y** ;
- ou, s'il est **rattaché** après sa majorité : moins de 21 ans au 1er janvier de Y, ou moins de 25 ans s'il fait des études ;
- ou **invalide** : sans limite d'âge.
- Hors périmètre : garde alternée (quarts de part), enfants majeurs mariés ou chargés de famille, personnes invalides autres que les enfants.

**TMI année par année**
- Les enfants quittent le foyer au fil du temps : le nombre de parts, donc la TMI, peut changer pendant la simulation (exemple : un couple passe de 11 % à 30 % quand ses deux enfants ne sont plus à charge).
- La TMI est donc calculée **pour chaque année civile** de la simulation, avec les enfants encore à charge cette année-là, à **revenu constant** (le revenu net imposable du profil).
- Le résultat est un **calendrier de TMI** : une liste de changements « à partir de l'année Y : TMI t ».

**Calcul**
1. Impôt avec toutes les parts = parts × barème(revenu ÷ parts).
2. Impôt avec les seules parts de base = parts de base × barème(revenu ÷ parts de base).
3. L'avantage des parts supplémentaires est **plafonné** : 1 807 € par demi-part (4 262 € pour la part accordée au parent isolé avec son premier enfant). Si l'écart entre 2 et 1 dépasse ce plafond, le plafonnement s'applique.
4. TMI = taux de la tranche où tombe le quotient (revenu ÷ parts), ou, si le plafonnement s'applique, le quotient calculé avec les parts de base.
- La décote, les réductions et crédits d'impôt sont ignorés : ils changent le montant de l'impôt, pas la tranche.
- La TMI ainsi calculée est une **valeur par défaut** : l'utilisateur peut la remplacer à la main dans le profil ; elle est alors fixe pour toutes les années.

**Utilisation dans les placements**
- Le calendrier de TMI remplace la « TMI actuelle » là où elle intervient chaque année :
  - **PER** : économie d'impôt des versements de l'année Y avec la TMI de Y ; déblocage anticipé imposé avec la TMI de son année ;
  - **livret bancaire**, option barème : impôt sur les intérêts de l'année Y avec la TMI de Y.
- La **TMI à la retraite** reste une valeur saisie, fixe.
- Dans la colonne, le paramètre « TMI actuelle » propose alors la valeur **« Selon le profil »**, avec une ligne d'aide qui résume le calendrier (« 11 % jusqu'en 2031, puis 30 % ») ; choisir un taux dans la liste revient à une TMI fixe.
- Le tableau détaillé du PER et du livret bancaire affiche une colonne **TMI** quand elle varie.
- Moteur : un paramètre de colonne `tmiSchedule` (liste `{ fromYear, tmi }`, rempli à partir du profil) ; TMI de l'année Y = dernier changement dont `fromYear` ≤ Y, sinon la TMI fixe.

## 5. Interface

### 5.1 Structure de la page
1. **En-tête** : titre, personne active et lien « Mon profil » (5.5), sélecteur de langue FR/EN, interrupteur Brut/Net.
2. **Zone placements** : jusqu'à 3 colonnes (empilées sur mobile). Chaque colonne :
   - choix du type de placement ;
   - paramètres principaux visibles, paramètres avancés repliables ;
   - liste des mouvements ponctuels (ajouter / supprimer) ;
   - boutons « Valeurs par défaut » et « Appliquer le profil » (5.5).
3. **Synthèse** : une carte par placement.
4. **Graphique** : évolution de la valeur des placements comparés.
5. **Détail** (repliable) : tableau année par année par placement.
6. **Pied de page** : mention « Simulation indicative, ne constitue pas un conseil en investissement », date des valeurs par défaut.

Les résultats se recalculent **en direct** à chaque modification.

### 5.2 Synthèse (par placement)
- Total versé
- Valeur finale (brute ou nette selon l'interrupteur)
- Intérêts / gains
- Frais payés
- Impôts et prélèvements sociaux
- Économie d'impôt (PER)
- Rendement annuel moyen net
- Avertissements (plafond atteint, versements bloqués, plafond de déduction PER dépassé, retrait refusé…)

### 5.3 Graphique
- Courbes de valeur par placement dans le temps (axe en années).
- Zone bas/haut pour les supports risqués.
- Option : visualiser versements cumulés vs gains.

### 5.4 Tableau détaillé (par année)
Année · versements · retraits · intérêts/gains · frais · impôts et prélèvements · valeur fin d'année · valeur nette si rachat total.

### 5.5 Profils (personnes)

Pour ne pas ressaisir sa situation à chaque visite, l'utilisateur enregistre une ou **plusieurs personnes** dans une page dédiée. Les données sont **conservées dans le navigateur** (localStorage) : elles restent sur cet appareil et dans ce navigateur, ne sont envoyées nulle part, et ne sont pas partagées entre appareils.

**Accès**
- Un lien **« Mon profil »** dans l'en-tête ouvre la page des profils, à l'adresse `#/profil` (navigation par l'URL, sans dépendance ajoutée). Un lien ramène au simulateur.
- Dans l'en-tête du simulateur, une liste choisit la **personne active** (ou « Aucune », qui revient aux valeurs par défaut de la config).

**Page des profils**
- Liste des personnes enregistrées : créer, modifier, dupliquer, supprimer (avec confirmation), choisir la personne active.
- Chaque modification est **enregistrée automatiquement**.
- Une mention rappelle où sont stockées les données, et un bouton **« Effacer toutes les données »** (avec confirmation) vide le stockage.
- Si le stockage du navigateur est indisponible (navigation privée, stockage bloqué), un message prévient que les profils ne seront pas conservés après fermeture de la page ; la page reste utilisable le temps de la visite.

**Champs d'une personne**
| Champ | Utilisation dans le simulateur |
|---|---|
| Nom | Libellé dans les listes |
| Date de naissance (mois et année) | PER : âge actuel à la date de début de la simulation, en années et mois |
| Sexe : homme, femme, non précisé | PER : âge de fin de simulation de la rente (hypothèse de durée de vie) : 85 ans pour un homme, 89 ans pour une femme, 0 (espérance de vie retenue) si non précisé. Le **calcul** de la rente reste unisexe, comme chez les assureurs. |
| Âge de départ à la retraite prévu | PER : âge de départ |
| Situation familiale : célibataire, marié ou pacsé, divorcé, veuf | Nombre de parts (4.7) ; assurance vie : abattement de couple (9 200 €) si marié ou pacsé |
| Enfants : pour chacun, date de naissance (mois et année), rattachement après 18 ans (non, jusqu'à 21 ans, jusqu'à 25 ans pour des études ; défaut : jusqu'à 21 ans), case « invalide » | Nombre de parts année par année (4.7) |
| Revenu net imposable du foyer | Calcul de la TMI (4.7) |
| TMI | Calculée automatiquement, année par année, et affichée sous forme de calendrier (« 2026-2031 : 11 %, 3 parts ; 2032-2034 : 30 %, 2,5 parts ; à partir de 2035 : 30 %, 2 parts ») ; une case « Saisir la TMI à la main » la remplace par un taux fixe |
| Revenus professionnels nets de la personne | PER : plafond de déduction (10 %) |
| Plafond épargne retraite de l'avis d'impôt : plafond de l'année, plafonds non utilisés N−1, N−2, N−3 | PER : plafond annuel et report (4.4.4) |
| TMI à la retraite estimée | PER |
| Revenu imposable du foyer et pensions brutes du foyer à la retraite | PER : impôt au barème sur le capital et la rente |
| Dont pensions du conjoint (affiché si marié ou pacsé) | PER : abattement de 10 % sur les pensions calculé par pensionné (plancher de 454 € chacun) |

Valeurs par défaut d'une nouvelle personne : celles de la config (40 ans, départ à 64 ans, TMI actuelle 30 %, à la retraite 11 %…), situation célibataire, sans enfant, revenus non renseignés.

**Utilisation dans le simulateur**
- Les valeurs de la personne active remplacent les valeurs par défaut de la config pour les paramètres concernés : **nouvelle colonne**, changement de type de placement et bouton **« Valeurs par défaut »**.
- Les colonnes déjà ouvertes **ne changent pas** quand on modifie le profil ou la personne active, pour qu'un calcul en cours ne bouge pas sans prévenir. Un bouton **« Appliquer le profil »** dans chaque colonne reprend volontairement les valeurs de la personne active.
- Correspondance avec les paramètres des placements :

| Paramètre | Placements | Valeur tirée du profil |
|---|---|---|
| Âge actuel, âge de départ | PER | date de naissance, âge de départ prévu |
| TMI actuelle | PER, livret bancaire (option barème) | calendrier de TMI (« Selon le profil »), ou TMI saisie à la main |
| TMI à la retraite | PER | TMI à la retraite estimée |
| Revenus professionnels, plafond annuel, plafonds non utilisés | PER | revenus professionnels, plafond épargne retraite |
| Âge de fin de simulation | PER | selon le sexe |
| Situation (seul / en couple) | assurance vie | en couple si marié ou pacsé |

- Les champs du profil laissés vides ne remplacent rien : la valeur par défaut de la config est gardée.

**Stockage**
- Une clé `simulateur.profils` contient `{ version, activeId, persons: [...] }`, versionnée pour pouvoir faire évoluer le format.
- Hors périmètre : mémoriser les simulations (colonnes ouvertes), encours existants des placements, synchronisation entre appareils, mutualisation des plafonds PER du couple, évolution des revenus dans le temps.

### 5.6 Page « Méthodologie et sources » (validée, livrée sur la branche `methodologie`)

Une page de référence qui permet de comprendre, vérifier et interpréter les résultats. Ce n'est pas une FAQ : chaque règle est énoncée, chiffrée, sourcée, et ses limites sont dites.

- **Langue** : contenu en français seulement. En anglais, le lien et le titre sont traduits, et une note en tête indique que la méthodologie n'existe qu'en français.
- **Branche** : `methodologie`, créée depuis `fiabilisation`.

**Accès**
- Lien **« Méthodologie »** dans l'en-tête, à côté de « Mon profil », adresse `#/methodologie` (même navigation par l'URL que les profils). Un lien ramène au simulateur.
- Ancres par section (`#/methodologie/fiscalite`…) pour pouvoir citer un passage.

**Présentation**
- Thème Bloom existant, sans nouveau composant graphique : colonne de lecture unique, table des matières en tête (et collante sur grand écran), titres numérotés.
- Formules en texte typographié (pas de bibliothèque mathématique), chacune suivie d'un exemple chiffré vérifiable à la main.
- Pas d'illustration décorative ni de texte promotionnel.

**Plan**
1. Principes : objectif, simulation mensuelle, conventions (dates, quinzaines, 31 décembre), brut / net / gains / économies d'impôt, date de référence des règles (revenus 2025, vérifiées le …).
2. Placements : Livret A et LDDS (une section commune, plafonds distincts), livret bancaire, assurance vie, PER. Pour chacun : fonctionnement, avantages et inconvénients, plafonds, disponibilité, versements et retraits, intérêts et capitalisation, frais, fiscalité, risques, particularités de la simulation.
3. Fiscalité : barème, TMI, quotient familial et plafonnement, décote, PFU, prélèvements sociaux (17,2 % / 18,6 %), abattements (assurance vie, pensions), déduction PER et report des plafonds, sorties PER en capital et en rente, système du quotient. Un exemple montre pourquoi l'économie d'impôt diffère de « versement × TMI » (changement de tranche, décote, plafonnement).
4. Comparaison : rendement annualisé et TRI (et ses cas « non pertinent » / « non calculable »), capital net disponible, effort d'épargne, économies d'impôt cumulées et réinvesties, inflation et gain en euros d'aujourd'hui, rente contre capital, scénarios bas / haut. Conditions d'une comparaison valable (même durée, même effort) et ses limites.
5. Limites et approximations : reprise des hypothèses de FISCAL_RULES.md et des hors-périmètres de la SPEC, incertitude des rendements, stabilité supposée de la fiscalité, rentes (table TGF05 à 0 %, décalage d'âge), clauses de contrat non modélisées. Chaque hypothèse est présentée comme telle.
6. Sources : tableau par règle avec titre du document, lien direct, règle concernée, date d'application, date de dernière vérification. **Sources institutionnelles uniquement** (impots.gouv.fr, BOFiP, Légifrance, Service-Public, economie.gouv.fr, AMF, Banque de France, Insee). Pour chaque règle aujourd'hui appuyée sur des sites spécialisés (FISCAL_RULES.md « concordante »), une source institutionnelle est recherchée ; à défaut, la source secondaire est affichée **et marquée comme telle**. Aucune référence n'est inventée : chaque lien est ouvert et vérifié avant d'être cité.
7. Fiabilité : ce qui a réellement été fait (audit fonctionnel et financier, vérification des règles, calculs indépendants, tests automatisés et de non-régression, cas limites), avec le nombre de tests. Version du simulateur et date de mise à jour de la méthodologie. Aucune certification revendiquée.
8. Avertissement : outil pédagogique d'aide à la décision, ne remplace pas un conseil financier ou fiscal personnalisé.

**Cohérence avec le moteur**
- Les montants cités (barème, plafonds, taux, abattements, frais et rendements par défaut) sont **lus dans `src/config/fiscal.ts` et `src/config/defaults.ts`**, jamais recopiés : un changement de paramètre met la page à jour.
- Les exemples chiffrés sont **calculés par les fonctions du moteur** au rendu (impôt, économie d'impôt, rachat d'assurance vie, prix de la rente…). Un test vérifie chaque exemple contre un calcul fait à la main, si bien qu'un écart entre la page et le moteur fait échouer les tests.
- Version : celle de `package.json`, injectée au build ; date de la méthodologie : constante dans la config.

**Précisions de la validation**
- Les références sont citées **auprès des règles** (lien court entre parenthèses, « source secondaire » le cas échéant), en plus du tableau des sources.
- Les **incertitudes fiscales restantes** sont listées explicitement (§5.1 de la page) : assiette de l'impôt des rachats d'assurance vie, cas particuliers du quotient familial, stabilité des règles.
- Les exemples sont **indépendants du profil actif** : données fixes, valeurs par défaut de la config.
- Les tests ne sont **pas présentés comme une garantie** d'exactitude ; aucune certification n'est revendiquée.
- Sources réutilisées de FISCAL_RULES.md, chaque lien rouvert le 20/11/2026 ; une seule source secondaire (tarif TGF05, Guide de la taxe).

**Réalisation**
- `src/methodology/examples.ts` : exemples calculés par le moteur ; `src/methodology/sources.ts` : références (titre, lien, règle, date d'application, date de vérification).
- `src/ui/methodology/` : page et sections, chargées à la demande (le simulateur ne charge pas la page tant qu'elle n'est pas ouverte).
- Styles ajoutés à `src/style.css` avec les seules variables du thème Bloom.
- `tests/methodology.test.ts` : exemples comparés à des calculs faits à la main, rendu de la page, citations des sources.

**Hors périmètre** : aucune modification du comportement des simulations, aucune nouvelle dépendance.

### 5.7 Comparaison qualitative des placements (validée, livrée sur la branche `comparaison-qualitative`)

Compléter la comparaison chiffrée par les caractéristiques qui ne se voient pas dans le rendement : disponibilité, risques, frais, fiscalité, transmission au décès. Informations courtes et factuelles ; aucun calcul financier modifié, aucun paramètre de simulation ajouté, pas de simulateur de succession.

**Interface**
- Sous chaque carte de synthèse, un bloc **« Caractéristiques, avantages et limites »**, **replié** par défaut.
- Ouverture et fermeture **synchronisées** : ouvrir ou fermer le bloc d'une colonne ouvre ou ferme ceux de toutes les colonnes, pour garder les catégories côte à côte.
- Branche : `comparaison-qualitative`, créée depuis `main`.
- **Catégories alignées** : les mêmes 7 catégories, dans le même ordre, pour chaque placement ; sur grand écran, chaque catégorie occupe une même rangée pour toutes les colonnes (CSS `subgrid`), pour lire horizontalement. Une catégorie sans objet pour un placement (rente viagère hors PER) affiche « sans objet ».
- Chaque élément est une phrase courte, marquée selon sa nature : **règle légale**, **pratique habituelle** ou **selon le contrat**. Un délai indicatif n'est jamais présenté comme garanti.
- Un lien « En savoir plus » mène à la section correspondante de la page « Méthodologie et sources ».
- Thème Bloom existant : composant `details` déjà utilisé dans l'application, sans nouveau style de carte.

**Catégories et contenu prévu** (à vérifier sur les sources avant rédaction)
1. **Disponibilité du capital** : retrait à tout moment (livrets, assurance vie), délais habituels de mise à disposition (pratique), blocage du PER jusqu'à la retraite, cas de déblocage anticipé.
2. **Risques et garanties** : capital garanti ou non (fonds euros, unités de compte), garantie des dépôts (fonds de garantie des dépôts et de résolution pour les livrets ; fonds de garantie des assurances de personnes pour l'assurance vie et le PER assurance), incertitude des rendements, risque d'inflation.
3. **Frais et contraintes** : frais renseignés dans la simulation, frais de sortie ou de transfert éventuels, plafonds de versement, contraintes contractuelles.
4. **Fiscalité du vivant** : résumé d'une ou deux lignes et renvoi vers la méthodologie (pas de duplication) ; conditions de durée (8 ans pour l'assurance vie).
5. **Transmission en cas de décès** : livrets et PER bancaire dans la succession ; assurance vie et PER assurance hors succession, avec désignation de bénéficiaires ; fiscalité selon l'âge au versement (avant ou après 70 ans) et abattements correspondants ; exonération du conjoint marié ou partenaire de PACS.
6. **Disponibilité des fonds après le décès** : blocage des comptes individuels à la connaissance du décès ; comptes joints ; dépenses pouvant être réglées sur les comptes du défunt (obsèques…) ; durée du règlement de la succession, variable (le délai de six mois concerne la déclaration de succession, pas le déblocage) ; capital d'assurance vie versé aux bénéficiaires en principe hors succession, dans le délai légal fixé après réception des pièces ; PER bancaire et PER assurance.
7. **Rente viagère du PER** (PER seulement) : décès avant liquidation (capital transmis) et après (rente simple : arrêt des versements) ; réversion au conjoint ; annuités garanties et décès pendant la période garantie ; une rente avec garanties est plus faible qu'une rente simple. Rappel : le simulateur calcule une rente simple.

**Adaptation aux paramètres de la colonne** (lecture seule, aucun nouveau paramètre)
- Assurance vie et PER : mention du risque de perte si une part est en unités de compte, garantie du capital (hors frais) sur la part en fonds euros.
- PER : avec ou sans déduction ; sortie en capital, rente ou mixte (la catégorie 7 est mise en avant si une rente est prévue).
- Livret bancaire : PFU ou option pour le barème.
- Frais : montants saisis cités (« frais sur versements de 2 % ») ; si nuls, « aucun frais sur versements saisi ».
- Situation familiale : assurance vie « couple » ou profil marié / pacsé → mention de l'exonération du conjoint ou du partenaire.
- Caractéristique contractuelle inconnue (type de PER bancaire ou assurance, garanties de la rente, clause bénéficiaire) : les possibilités sont présentées, sans supposer qu'une garantie est acquise.

**Sources**
- Sources de la page méthodologique réutilisées ; sources officielles ajoutées pour la succession et la garantie des dépôts (Service-Public, Légifrance : Code des assurances, CGI art. 990 I et 757 B ; Banque de France / ACPR ; sites des fonds de garantie, à défaut marqués comme tels), chaque lien ouvert avant d'être cité.
- La page « Méthodologie et sources » reçoit une section **« Transmission et décès »** (règles et sources) et les nouvelles références dans son tableau ; les blocs des cartes restent courts et renvoient vers elle.

**Traductions** : FR et EN.

**Architecture**
- Un module par placement dans `src/qualitative/` (à côté du moteur, sans dépendance à Vue) : catégories, éléments avec leur nature, identifiants de sources, conditions d'affichage selon les paramètres, textes FR et EN. Ajouter un placement = ajouter un module.
- Le composant d'affichage ne contient aucun texte métier.

**Précisions de la validation**
- Fiscalité au décès distinguée : assurance vie selon l'**âge de l'assuré au versement** (avant 70 ans : 152 500 € par bénéficiaire ; après : 30 500 € de primes, gains exonérés) ; PER assurance selon l'**âge du titulaire au décès** (après 70 ans : montant total taxé, gains compris) ; PER bancaire dans la succession.
- Garanties distinguées : garantie du capital (support), garantie de l'État pour le Livret A, le LDDS et le LEP (100 000 €, qui s'ajoute), FGDR pour les dépôts bancaires (100 000 € par client et par établissement), FGAP pour les contrats d'assurance éligibles (70 000 €) ; pour un PER, la protection dépend de sa forme.
- Le conjoint n'est jamais supposé bénéficiaire : son exonération n'est mentionnée que s'il est désigné, et seulement pour une colonne en couple.
- Nature discrète : seules les mentions « pratique habituelle » et « selon le contrat » apparaissent, en texte discret à la fin de la phrase ; une ligne de légende en pied de bloc.
- Mobile : une seule colonne, chaque bloc suit sa carte, sans alignement.
- Informations contextuelles lues dans les paramètres de la colonne (`slot.params`, dont son contexte fiscal), jamais dans le profil actif.

**Réalisation**
- `src/qualitative/` : types, registre (`resolveQualitative`), éléments communs, un module par placement.
- `SummaryCards.vue` : chaque colonne (`.card-col`) regroupe la carte, le bouton et les catégories ; état d'ouverture partagé.
- Méthodologie : section 2.5 « Garanties, transmission et disponibilité après le décès », 12 sources ajoutées (Légifrance, BOFiP, impots.gouv.fr, Service-Public, Direction générale du Trésor, FGDR), toutes ouvertes le 20/11/2026. La page du ministère de l'Économie sur la garantie des dépôts n'a pas pu être ouverte (refus d'accès) : la page de la Direction générale du Trésor est citée à la place.

**Tests** : chaque placement définit les 7 catégories ; chaque élément a un texte FR et EN et une nature ; chaque source citée existe ; les variantes selon les paramètres (unités de compte, sortie en rente, PFU / barème, couple) ; rendu des blocs repliés ; tests existants et build inchangés.

## 6. Architecture

```
src/config/      valeurs par défaut (taux, plafonds, barèmes, profils de risque)
src/engine/      moteur de calcul en TypeScript pur, sans dépendance à Vue
  core/          calendrier mensuel, quinzaines, contrat multisupport, TRI
  products/      un module par placement (livretReglemente, livretBancaire, assuranceVie, per)
  registry.ts    liste des placements disponibles
src/ui/          composants Vue
src/i18n/        traductions FR / EN
tests/           tests Vitest du moteur
```

- **Chaque placement est un module** qui déclare : identifiant, libellés, **schéma de paramètres** (type, défaut, min/max, groupe principal/avancé) et une fonction `simulate(params)` qui renvoie la chronologie mensuelle, les lignes annuelles, la synthèse et les avertissements.
- Le **formulaire est généré à partir du schéma** : ajouter un PEA = écrire un module + ses défauts + ses traductions, sans toucher à l'interface.
- Le moteur est déterministe et testable isolément ; l'inflation et le scénario bas/haut sont des passes séparées.
- L'export / import de simulation (hors v1) sera facile car l'état complet est un objet sérialisable.

## 7. Tests

- Les résultats attendus sont calculés **indépendamment du code de production**, à partir des règles documentées dans `FISCAL_RULES.md` ; un attendu n'est jamais modifié pour faire passer un test (les corrections d'attendus sont justifiées dans `AUDIT_REMEDIATION.md`).
- `tests/tax.test.ts` : moteur fiscal (barème, décote, quotient familial, système du quotient, abattement sur les pensions, migration des profils).
- `tests/livrets.test.ts`, `tests/contracts.test.ts`, `tests/profiles.test.ts` : chaque placement et le profil.
- `tests/comparison.test.ts` : TRI et sa pertinence, actualisation, réinvestissement, **conservation des flux**.
- `tests/edge.test.ts` : bornes, changements d'année et d'âge, retraits totaux, rendements nuls ou négatifs, frais excessifs, simulations longues, saisies incohérentes.
- `tests/final-fix.test.ts` : corrections finales (déblocage PER l'année du versement, rachat d'assurance vie en perte, abattement sur les pensions par pensionné, résolution de la détection des TRI multiples, paramètres fiscaux vérifiés sur les sources officielles).
- `tests/qualitative.test.ts` : comparaison qualitative (catégories, textes FR et EN, sources, règles distinguées, adaptation aux paramètres de la colonne, blocs repliés).
- `tests/methodology.test.ts` : exemples chiffrés de la page « Méthodologie et sources », rendu de la page, sources.
- `tests/ui.test.ts` : les montants des cartes, du tableau et des séries du graphique sont exactement ceux du moteur (rendu serveur des composants).
- Sous Windows, lancer Vitest depuis `D:\Perso\finances` (lettre de lecteur en majuscule).

## 8. Hors périmètre v1 (prévu plus tard)

- Inflation / euros constants
- Export / import d'une simulation (fichier)
- PEA, CTO, LEP et autres placements
- Assurance vie : versements après 70 ans, succession, option barème, arbitrages
- Taux variables par période
- Rente PER : revalorisation annuelle, réversion au conjoint, annuités garanties, rente par paliers, table de mortalité complète par âge (on utilise une durée moyenne)

## 9. Points ouverts

- Les valeurs par défaut ont été vérifiées le 20/11/2026 auprès de sites spécialisés, pas de textes officiels. À revoir à chaque révision des taux (Livret A : 1er février et 1er août).
- Le taux boosté du Bourso+ diffère selon les sources (2,10 % ou 2,50 % avec l'offre Metal) : il est laissé à 0 par défaut, l'utilisateur saisit son offre.
- Les rendements et écarts des profils de risque UC (4.5) sont des hypothèses à valider.
- Prélèvements sociaux du PER : 18,6 % sur toutes les sorties depuis 2026, confirmé par Service-Public (A18841).
- Un relèvement du plafond du Livret A en 2027 a été évoqué par une source isolée, non confirmée : 22 950 € conservé.
- Une proposition de rendre la liquidation du PER obligatoire à l'âge légal a été évoquée, sans valeur de loi à ce jour : non prise en compte.
- Barème de l'impôt (4.7) : celui de 2026 sur les revenus 2025. Le barème 2027 (revenus 2026) sera fixé par la loi de finances 2027, en discussion ; une source évoque un plafond du quotient familial porté à 1 845 € par demi-part, non confirmé : 1 807 € conservé.
- Âges de fin de simulation par sexe (5.5) : dérivés de l'espérance de vie INSEE 2025 à 60 ans (23,9 ans pour les hommes, 27,9 ans pour les femmes), arrondis ; à affiner si besoin.
