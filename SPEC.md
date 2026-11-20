# Simulateur de placements — Spécification v1

> Statut : v1 livrée. Évolution PER (rente viagère, bouton Max, §4.4.1 à 4.4.3) livrée. Report des plafonds PER (§4.4.4) : validé, branche `per-report-plafonds`.
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

### 3.5 Inflation (hors v1, prévue dans l'architecture)
- Le moteur calcule en euros courants.
- Une étape de transformation séparée pourra plus tard convertir les résultats en euros constants (taux d'inflation moyen paramétrable), sans toucher aux calculs des placements.

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
- Les intérêts sont **crédités et capitalisés au 31 décembre**. Les intérêts capitalisés peuvent faire dépasser le plafond (c'est légal).
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
- **Fiscalité** : intérêts imposés chaque année à la capitalisation :
  - flat tax : 12,8 % d'impôt + 18,6 % de prélèvements sociaux = 31,4 % (taux 2026) ;
  - option barème : TMI + prélèvements sociaux.
- Vue brute : intérêts avant impôt ; vue nette : intérêts après impôt (l'impôt est payé à part chaque année, il n'est pas prélevé sur le livret, mais il est déduit dans la vue nette).

### 4.3 Assurance vie

**Paramètres**
| Paramètre | Défaut |
|---|---|
| Capital initial, versements, mouvements ponctuels | 0 € |
| Contrat déjà ouvert + date d'ouverture | non ; si oui, la date d'ouverture sert à la règle des 8 ans, et le capital initial (valeur actuelle) ne supporte pas de frais sur versement |
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

**Fiscalité des rachats** (partiels en cours de route, total en fin de simulation pour le net)
- Part de gains dans un rachat = montant du rachat × (gains totaux / valeur du contrat).
- **Avant 8 ans** : 12,8 % (flat tax) sur les gains + prélèvements sociaux (sur la part UC, ceux du fonds euros ayant déjà été payés).
- **Après 8 ans** :
  - abattement annuel sur les gains : 4 600 € (célibataire) / 9 200 € (couple) ;
  - au-delà : 7,5 % si le total des versements (nets des rachats) ≤ 150 000 €, 12,8 % sur la fraction au-delà ;
  - prélèvements sociaux comme ci-dessus (non concernés par l'abattement).
- Hors v1 : versements après 70 ans, succession, option pour le barème.

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
| Prélèvements sociaux sur les gains | 18,6 % (taux 2026 ; l'application au PER assurantiel est débattue, d'où le paramètre) |

**Paramètres de la rente** (visibles dans les paramètres principaux dès que la sortie n'est pas « Capital »)
| Paramètre | Défaut |
|---|---|
| Méthode de calcul | table de mortalité / taux de conversion |
| Espérance de vie actuelle (âge), pour une personne arrivée à la retraite | 86 ans (moyenne hommes/femmes INSEE 2025 à 60 ans : 23,9 et 27,9 ans de vie restante) |
| Table de mortalité garantie à la souscription | non |
| Hausse de l'espérance de vie | +1 an par décennie (tendance INSEE 2000-2025) |
| Taux technique | 0,5 % |
| Frais sur arrérages | 2 % de chaque rente |
| Taux de conversion (méthode « taux de conversion ») | 3,5 % du capital par an (fourchette constatée à 64 ans : 3,1 à 4,3 %) |
| Âge de fin de simulation (hypothèse de durée de vie) | 0 = l'espérance de vie retenue pour le calcul (86 ans, ou plus si la table n'est pas garantie) |

**Règles**
- La durée de la simulation est l'âge de départ moins l'âge actuel (calculée, pas saisie).
- **Retraits interdits avant la retraite**, sauf **déblocage anticipé « résidence principale »** (option sur un mouvement ponctuel).
- **Économie d'impôt à l'entrée** (si versements déduits) : versement × TMI actuelle, l'année du versement. Le capital initial compte comme un versement de la première année.
- **Déblocage anticipé** : imposé comme une sortie en capital, mais avec la TMI actuelle.
- **Plafond de déduction** (salariés) : 10 % des revenus professionnels nets, avec un plancher de 4 710 € et un plafond de 37 680 € (valeurs 2026, calculées sur le PASS 2025 de 47 100 €). Sans revenus renseignés, on applique le plancher. Un **avertissement** s'affiche si les versements de l'année dépassent le plafond ; la part au-delà ne génère pas d'économie d'impôt. Le plafond figurant sur l'avis d'imposition est le chiffre qui fait foi : un champ permet de le saisir directement.
- Report des plafonds non utilisés des années précédentes : voir 4.4.4.
- Hors périmètre : plafonds des indépendants (TNS), mutualisation dans le couple.
- **Sortie en capital** :
  - versements déduits : impôt sur le revenu au barème (TMI à la retraite), pas de prélèvements sociaux ;
  - gains : flat tax (12,8 % + prélèvements sociaux) ;
  - versements non déduits : exonérés, seuls les gains sont imposés.
- **Sortie en rente** : voir 4.4.1 (calcul) et 4.4.2 (phase de versement).
- **Fiscalité de la rente** (inchangée) :
  - versements déduits : rente imposée au barème après abattement de 10 %, + prélèvements sociaux sur une fraction selon l'âge (régime des rentes viagères à titre onéreux) ;
  - versements non déduits : seule une fraction de la rente est imposée, selon l'âge au premier versement ;
  - fraction imposable selon l'âge au premier versement : 70 % avant 50 ans, 50 % de 50 à 59 ans, 40 % de 60 à 69 ans, 30 % à 70 ans et plus.
- **Net du PER** = capital net perçu à la retraite + total des rentes nettes perçues jusqu'à l'âge de fin de simulation + économies d'impôt cumulées à l'entrée.

#### 4.4.1 Calcul de la rente

Les assureurs calculent la rente avec une **table de mortalité réglementaire** (TGF05, unisexe). L'espérance de vie progresse (à 60 ans : de 20,4 à 23,9 ans pour les hommes et de 25,6 à 27,9 ans pour les femmes entre 2000 et 2025, source INSEE), et les tables sont révisées en conséquence. Selon le contrat, la rente est calculée avec :
- la **table en vigueur à la souscription**, si le contrat la garantit : les révisions ultérieures ne s'appliquent pas, ce qui est plus favorable ;
- la **table en vigueur à la liquidation** sinon : la rente baisse si l'espérance de vie a augmenté entre-temps.

**Durée retenue** (n, en années après le départ) :
- table garantie : n = espérance de vie actuelle − âge de départ (86 − 64 = 22 ans) ;
- table non garantie : n = espérance de vie actuelle + hausse de l'espérance de vie × années jusqu'à la retraite − âge de départ (+1 an par décennie, à 40 ans pour un départ à 64 ans : 86 + 2,4 − 64 = 24,4 ans) ;
- l'espérance de vie à saisir est celle d'une personne **arrivée à l'âge de la retraite**, plus élevée que l'espérance de vie à la naissance ; une aide sous le champ le précise ;
- si l'âge de départ dépasse l'espérance de vie saisie, la durée est ramenée à 1 an et un avertissement s'affiche.

**Méthode « table de mortalité »** :
- rente annuelle = capital converti × t / (1 − (1 + t)^−n) × (1 − frais sur arrérages), avec t le taux technique (si t = 0 : capital converti / n) ;
- la synthèse affiche la durée retenue et, si la table n'est pas garantie, la rente qu'on aurait eue avec une table garantie, pour montrer l'effet de ce choix.

**Méthode « taux de conversion »** (devis d'assureur) :
- rente annuelle = capital converti × taux de conversion × (1 − frais sur arrérages).

**L'espérance de vie ne sert qu'au calcul du montant.** La rente est viagère : elle est versée jusqu'au décès, quelle que soit sa date. Si l'on vit plus longtemps que prévu, l'assureur continue de payer ; si l'on décède avant, il garde le capital (mutualisation).

La rente est **fixe** (même montant chaque année). Le capital converti est la part du capital non versée en capital (100 % en sortie rente, 100 % − part en capital en sortie mixte).

#### 4.4.2 Phase de versement

La simulation continue après la retraite, **jusqu'à l'âge de fin de simulation**, une hypothèse de durée de vie indépendante du calcul de la rente. Par défaut, c'est l'espérance de vie retenue pour le calcul (exemple : 86 + 2,4 = 88,4 ans, soit 88 ans et 5 mois) ; l'utilisateur peut saisir un autre âge pour voir le cas d'une vie plus courte ou plus longue.
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
| Plafond non utilisé de l'année N−1 | 0 € |
| Plafond non utilisé de l'année N−2 | 0 € |
| Plafond non utilisé de l'année N−3 | 0 € |

- N est l'année de la date de début ; les libellés affichent les vraies années (exemple pour un début en 2026 : « non utilisé en 2025 », « en 2024 », « en 2023 »).
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

**Hors périmètre** : mutualisation des plafonds dans le couple, plafonds des indépendants (TNS).

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

## 5. Interface

### 5.1 Structure de la page
1. **En-tête** : titre, sélecteur de langue FR/EN, interrupteur Brut/Net.
2. **Zone placements** : jusqu'à 3 colonnes (empilées sur mobile). Chaque colonne :
   - choix du type de placement ;
   - paramètres principaux visibles, paramètres avancés repliables ;
   - liste des mouvements ponctuels (ajouter / supprimer) ;
   - bouton « Réinitialiser aux valeurs par défaut ».
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

- Cas calculés à la main pour chaque placement (ex. : Livret A, 100 €/mois pendant 1 an ; versement en milieu de mois ; dépassement de plafond ; rachat d'assurance vie avant et après 8 ans ; sortie PER en capital et en rente).
- Tests du blocage des plafonds et des retraits PER interdits.

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
- Le PER assurantiel est-il à 17,2 % ou 18,6 % de prélèvements sociaux ? Débattu ; 18,6 % par défaut, prudent.
- Un relèvement du plafond du Livret A en 2027 a été évoqué par une source isolée, non confirmée : 22 950 € conservé.
- Une proposition de rendre la liquidation du PER obligatoire à l'âge légal a été évoquée, sans valeur de loi à ce jour : non prise en compte.
