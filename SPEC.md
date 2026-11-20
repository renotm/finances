# Simulateur de placements — Spécification v1

> Statut : v1 livrée. Évolution PER (rente viagère, bouton Max, §4.4.1 à 4.4.3) livrée. Report des plafonds PER (§4.4.4) : codé, branche `per-report-plafonds`. Profils et calcul de la TMI (§4.7, §5.5) : codés, branche `profils`.
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
  - versements déduits : rente imposée comme une pension, après abattement de 10 % **plafonné** compte tenu des pensions du foyer (sans pensions renseignées : 10 % sans plancher, limité au plafond) ; prélèvements sociaux sur la fraction imposable selon l'âge ;
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
- Prélèvements sociaux du PER : 18,6 % sur toutes les sorties depuis 2026, confirmé par Service-Public (A18841).
- Un relèvement du plafond du Livret A en 2027 a été évoqué par une source isolée, non confirmée : 22 950 € conservé.
- Une proposition de rendre la liquidation du PER obligatoire à l'âge légal a été évoquée, sans valeur de loi à ce jour : non prise en compte.
- Barème de l'impôt (4.7) : celui de 2026 sur les revenus 2025. Le barème 2027 (revenus 2026) sera fixé par la loi de finances 2027, en discussion ; une source évoque un plafond du quotient familial porté à 1 845 € par demi-part, non confirmé : 1 807 € conservé.
- Âges de fin de simulation par sexe (5.5) : dérivés de l'espérance de vie INSEE 2025 à 60 ans (23,9 ans pour les hommes, 27,9 ans pour les femmes), arrondis ; à affiner si besoin.
