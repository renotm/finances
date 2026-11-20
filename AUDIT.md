# Audit fonctionnel et financier du simulateur de placements

> Date : 20/11/2026. Branche auditée : `profils` (commit `c02c3a6`).
> Périmètre : moteur de calcul (Livret A, LDDS, livret bancaire, assurance vie, PER, TMI, rendement annuel).
> Aucun fichier source n'a été modifié. Aucune anomalie n'a été corrigée.

## 1. Synthèse

| Statut | Nombre de contrôles |
|---|---|
| Conforme | 42 |
| Incorrect | 9 |
| À vérifier | 7 |
| **Total** | **58** |

**Anomalies de gravité élevée**
1. **PER, économie d'impôt à l'entrée** (C32) : calculée comme versement × TMI. Quand le versement fait changer de tranche, elle est surestimée : **6 000 € au lieu de 4 260 €** (+41 %) dans le cas testé.
2. **PER, sortie en capital** (C34) : les versements déduits sont imposés à un taux unique (la TMI à la retraite), alors qu'ils s'ajoutent au revenu imposé au barème progressif : **16 500 € d'impôt au lieu de 54 077 €** sur 150 000 € dans le cas testé.
3. **PER, montant de la rente** (C39) : la méthode « espérance de vie » donne un taux de conversion de **4,72 %** à 64 ans, au-dessus des taux constatés sur le marché (**3,1 à 4,3 %**). La rente est surestimée de 10 à 50 %.

**Anomalies de gravité moyenne**
4. **PER, déblocage anticipé** (C33) : un déblocage réduit à tort l'économie d'impôt des versements de la même année (**750 € au lieu de 1 413 €**).
5. **Livret bancaire, valeur brute** (C14) : la valeur « brute » affichée (11 605 €) n'existe pas sur le livret réel (11 078 €), où la banque retient l'impôt chaque année.
6. **Assurance vie, contrat déjà ouvert** (C25) : les plus-values latentes d'un contrat existant sont ignorées, ce qui sous-estime l'impôt au rachat.

Le Livret A et le LDDS, les règles de l'assurance vie (8 ans, abattement, seuil de 150 000 €, rachats partiels), le calcul de la TMI et le rendement annuel sont **conformes**.

## 2. Méthode

- **Règles** vérifiées auprès de sources officielles (service-public.gouv.fr, economie.gouv.fr, BOFiP cité par des sources spécialisées) et, à défaut, de sources spécialisées concordantes. Les sources secondaires sont signalées.
- **Calculs indépendants** : chaque résultat attendu est recalculé avec une formule écrite pour l'audit, sans réutiliser le code de l'application. Exemples : simulation des quinzaines avec dates de valeur explicites, impôt au barème part par part, TRI par la méthode de Newton (l'application utilise une dichotomie).
- **Comparaison** : le moteur est exécuté sur les mêmes cas, depuis un dossier extérieur au projet. Tolérance : 1 centime.
- **Balayage** : la TMI calculée par l'application est comparée à la pente réelle de l'impôt plafonné sur 1 170 situations (0 à 4 enfants, couple ou parent seul, revenus de 10 000 € à 300 000 €).

**Échelle de gravité** : élevée (résultat financier faussé de façon significative dans des cas courants), moyenne (écart notable dans des cas particuliers ou présentation trompeuse), faible (écart mineur ou cas rare), info (limite connue, sans erreur).

## 3. Contrôles détaillés

### 3.1 Livret A et LDDS

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C1 | Taux | 1,7 % depuis le 01/08/2026 | Selectra, Toutsurmesfinances (secondaires) | 1,7 % | 1,7 % | Conforme | — |
| C2 | Plafonds | 22 950 € (Livret A), 12 000 € (LDDS) | Nalo, Neofa (secondaires) | 22 950 / 12 000 € | 22 950 / 12 000 € | Conforme | — |
| C3 | Intérêts par quinzaine | Solde de la quinzaine × taux / 24 | Selectra, Moneyvox | 1 200 € un an : 1 220,40 € | 1 220,40 € | Conforme | — |
| C4 | Date de valeur d'un versement | Versement du 1er au 15 : intérêts à partir du 16 | Selectra, Toutsurmesfinances | 100 €/mois versés le 1er : 1 210,20 € | 1 210,20 € | Conforme | — |
| C5 | Date de valeur d'un retrait | Le retrait cesse de porter intérêt dès le début de la quinzaine | Selectra | Retrait de 600 € le 1er juillet : 615,30 € | 615,30 € | Conforme | — |
| C6 | Capitalisation | Intérêts capitalisés au 31/12 ; départ en cours d'année | Moneyvox | Départ en juillet, 12 mois : 1 017,07 € | 1 017,07 € | Conforme | — |
| C7 | Simulation longue | Combinaison de C3 à C6 | Calcul indépendant | 1 000 € + 100 €/mois, 10 ans : 14 254,94 € | 14 254,94 € | Conforme | — |
| C8 | Plafond des versements | Versements bloqués au plafond ; les intérêts peuvent le dépasser | Service-public (F2365, via sources) | 22 900 € + 100 €/mois : 50 € acceptés | 22 950 € versés au total | Conforme | — |
| C9 | Fiscalité | Intérêts exonérés d'impôt et de prélèvements sociaux | economie.gouv.fr | 0 € | 0 € | Conforme | — |
| C10 | Arrondis | Les banques arrondissent les intérêts au centime | Pratique bancaire | Écart < 1 centime par an | Pas d'arrondi | Conforme | Info |

### 3.2 Livret bancaire

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C11 | Taux d'imposition 2026 | PFU 31,4 % = 12,8 % d'IR + 18,6 % de prélèvements sociaux | economie.gouv.fr (Bercy infos) | 31,4 % | 31,4 % | Conforme | — |
| C12 | Première année | Impôt sur 150 € d'intérêts | Calcul indépendant | 10 102,90 € | 10 102,90 € | Conforme | — |
| C13 | Capitalisation des intérêts nets | La banque retient 12,8 % et les prélèvements sociaux à l'inscription des intérêts : seuls les intérêts **nets** sont capitalisés | economie.gouv.fr, Moneyvox, JeChange | 10 000 € à 1,5 % sur 10 ans : 11 077,98 € | 11 101,31 € (intérêts capitalisés bruts, impôt payé à part) | **Incorrect** | Faible (+23 €, +0,2 %) |
| C14 | Valeur « brute » | Le solde réel du livret est déjà net des retenues | Idem | 11 077,98 € | 11 605,41 € affichés en vue brute | **Incorrect** (présentation) | Moyenne |
| C15 | Option barème | Le 12,8 % reste retenu comme acompte, régularisé l'année suivante ; 6,8 % de CSG déductible | economie.gouv.fr, AXA | Impôt final à la TMI, avec un décalage d'un an | Impôt à la TMI l'année même, CSG déductible ignorée | À vérifier | Faible |
| C16 | Dispense de l'acompte | Possible sous conditions de revenu fiscal de référence | Moneyvox, BforBank | Variante non modélisée | — | Conforme | Info |

### 3.3 Assurance vie

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C17 | Prélèvements sociaux | 17,2 % : l'assurance vie est exclue de la hausse de 2026 | Défiscalisation France (art. 12 LFSS 2026), Time2money (secondaires) | 17,2 % | 17,2 % | Conforme | — |
| C18 | Rendement net du fonds euros | Frais de gestion prélevés sur l'encours : (1 + 3,2 %) × (1 − 0,6 %) − 1 = 2,58 % | Calcul indépendant | 258,08 € sur 10 000 € | 260,00 € (3,2 % − 0,6 %) | **Incorrect** (approximation) | Faible (0,02 point/an) |
| C19 | Unités de compte | Valorisation composée, frais sur encours | Calcul indépendant | 5 %, frais 0,6 %, 1 an : 10 437,00 € | 10 437,00 € | Conforme | — |
| C20 | Rachat avant 8 ans | 12,8 % + 17,2 % sur les gains | Service-public F22414 (via sources) | 10 350,00 € | 10 350,00 € | Conforme | — |
| C21 | Rachat après 8 ans | Abattement de 4 600 € ; 7,5 % jusqu'à 150 000 € de primes, 12,8 % au-delà, au prorata | Idem | 300 000 € de primes : 322 261,90 € | 322 261,90 € | Conforme | — |
| C22 | Rachat partiel | Produits = R − P × R / V | BOFiP (via AFER) | 57,14 € d'impôt | 57,14 € | Conforme | — |
| C23 | Fonds euros : assiette de l'IR au rachat | Produits avant ou après les prélèvements sociaux annuels ? | BOFiP BOI-RPPM-RCM-20-10-20-50, non consulté directement | Hypothèse « produits nets » : 10 187,72 € | 10 182,00 € (produits bruts) | À vérifier | Faible (5,72 € sur 10 000 €) |
| C24 | Régularisation des prélèvements sociaux | Les prélèvements déjà payés sur le fonds euros sont déduits au rachat | AXA, La retraite en clair | Pas de double prélèvement | Pas de double prélèvement | Conforme | — |
| C25 | Contrat déjà ouvert | Les produits d'un rachat se calculent sur les primes versées depuis l'origine | BOFiP | Prise en compte des plus-values latentes | Primes supposées égales à la valeur actuelle | **Incorrect** | Moyenne |
| C26 | Seuil de 150 000 € | Primes nettes de tous les contrats du foyer, au 31/12 de l'année précédente | Service-public | Tous contrats | Contrat simulé seul | À vérifier | Faible |
| C27 | Frais sur versements | Prélevés sur chaque versement | Contrat | Conforme | Conforme | Conforme | — |
| C28 | Frais supérieurs au rendement | Pas de prélèvements sociaux négatifs | Calcul indépendant | Impôts ≥ 0 | Impôts ≥ 0 | Conforme | — |

### 3.4 PER

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C29 | Plafond de déduction | 10 % des revenus professionnels, plancher 4 710 €, maximum 37 680 € (PASS 2025) | Meilleurtaux, Linxea, Nalo (secondaires) | 4 710 € à 37 680 € | 4 710 € à 37 680 € | Conforme | — |
| C30 | Report des plafonds | 3 ans pour les plafonds antérieurs à 2026, 5 ans ensuite ; imputation sur le plafond de l'année puis du plus ancien au plus récent | BOFiP du 10/08/2026 via Goodvest et Moneyvox ; art. 10 LF 2026 | Plafond 2023 : dernier usage en 2026 ; plafond 2026 : en 2031 | 2026 ; 2031 | Conforme | — |
| C31 | Correspondance avec l'avis d'impôt | Libellés « plafond non utilisé en 2025 » contre « revenus 2025 » sur l'avis | Avis d'imposition | Même année de référence | Année de versement | À vérifier | Faible |
| C32 | Économie d'impôt à l'entrée | Économie = IR(revenu) − IR(revenu − versement), au barème | CGI art. 163 quatervicies ; barème 2026 | Couple, 70 000 €, versement de 20 000 € : 4 259,98 € | 6 000,00 € (20 000 × 30 %) | **Incorrect** | **Élevée** |
| C33 | Déblocage anticipé la même année | La déduction porte sur les versements effectués dans l'année, même en partie débloqués ensuite | CGI art. 163 quatervicies | 5 000 € versés, 2 500 € débloqués : 1 413,00 € | 750,00 € | **Incorrect** | Moyenne |
| C34 | Sortie en capital, versements déduits | Ajoutés aux revenus de l'année et imposés au barème progressif (système du quotient éventuellement applicable) | Service-public F34982, Fortuneo | 150 000 €, retraité avec 25 000 € de revenus : 54 076,52 € | 16 500,00 € (150 000 × 11 %) | **Incorrect** | **Élevée** |
| C35 | Sortie en capital, gains | PFU 12,8 % + 18,6 % de prélèvements sociaux | Service-public A18841 | 31,4 % | 31,4 % | Conforme | — |
| C36 | Prélèvements sociaux 2026 | 18,6 % sur toutes les sorties de PER, en capital ou en rente | Service-public A18841 | 18,6 % | 18,6 % (paramètre) | Conforme | — |
| C37 | Rente issue de versements déduits | Barème après abattement de 10 % ; prélèvements sociaux sur la fraction imposable selon l'âge | Service-public F34982, Invesse | 4 % de 10 000 €, 64 ans : 330,64 € net | 330,64 € | Conforme | — |
| C38 | Fraction imposable des rentes | 70 % / 50 % / 40 % / 30 % selon l'âge au premier versement | CGI art. 158-6 (via Invesse, La retraite en clair) | Valeurs identiques | Valeurs identiques | Conforme | — |
| C39 | Montant de la rente (méthode espérance de vie) | Les assureurs utilisent une rente viagère actualisée sur une table générationnelle prudente (TGF05) | Linxea, Cleerly, Hagnéré (secondaires) | 3,1 % à 4,3 % du capital à 64-65 ans | 4,72 % (22 ans à 0,5 %, 2 % de frais) | **Incorrect** | **Élevée** |
| C40 | Espérance de vie selon l'âge de départ | L'espérance de vie résiduelle dépend de l'âge atteint (INSEE) | INSEE | Départ à 70 ans : environ 17,5 ans | 16,1 ans (86 ans fixe) | **Incorrect** | Faible |
| C41 | Plafonnement de l'abattement de 10 % sur les pensions | Abattement plafonné par foyer | CGI art. 158-5 a | Plafond appliqué | Pas de plafond | À vérifier | Faible |
| C42 | Date de l'économie d'impôt | Réduit l'impôt payé l'année suivante | CGI | Décalage d'un an dans le rendement | Comptée au 31/12 de l'année | Conforme | Info |
| C43 | « Valeur nette » du PER en rente | Somme de capital, de rentes sur plusieurs décennies et d'économies d'impôt, sans actualisation | Méthodologie | — | Somme non actualisée | Conforme | Info |

### 3.5 Calcul de la TMI

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C44 | Barème 2026 | 0 / 11 / 30 / 41 / 45 % aux seuils de 11 600, 29 579, 84 577, 181 917 € | Kohen Avocats, Hagnéré, donnees-publiques.fr | Identique | Identique | Conforme | — |
| C45 | Nombre de parts | Couple 2 ; enfants 0,5, 0,5, puis 1 ; parent isolé + 0,5 ; veuf avec enfant comme un couple | economie.gouv.fr (Bercy infos), justice.fr | Identique | Identique | Conforme | — |
| C46 | Plafonnement du quotient familial | 1 807 € par demi-part | Moicombien, Fiscaloo (2026) | Couple, 2 enfants, 88 000 € : 30 % | 30 % | Conforme | — |
| C47 | Cohérence d'ensemble | TMI = pente de l'impôt plafonné | Calcul indépendant | 0 écart sur 1 170 cas | 0 écart | Conforme | — |
| C48 | Plafond du parent isolé | 4 262 € selon une source, 4 224 € selon une autre | Sources divergentes | À confirmer (brochure IR 2026) | 4 262 € | À vérifier | Faible |
| C49 | Cas particuliers | Réduction complémentaire des veufs, demi-parts spéciales, garde alternée | Brochure pratique IR | Non modélisés | Non modélisés | À vérifier | Faible |
| C50 | Décote | Dans la zone de décote, le taux marginal effectif dépasse la tranche | CGI art. 197 | Hors périmètre (spec §4.7) | Ignorée | Conforme | Info |
| C51 | Âge des enfants | Situation au 1er janvier de l'année des revenus ; 18, 21 ou 25 ans | CGI art. 196 et 196 B | Identique | Identique | Conforme | — |

### 3.6 Rendement annuel, unités et cas limites

| N° | Contrôle | Règle applicable | Source | Attendu | Obtenu | Statut | Gravité |
|---|---|---|---|---|---|---|---|
| C52 | Rendement annuel (TRI) | Taux mensuel annualisé : (1 + r)^12 − 1 | Méthode de Newton indépendante | Livret A 10 ans : 1,6890 % | 1,6890 % | Conforme | — |
| C53 | Unités | Pourcentages saisis en %, convertis en décimal ; montants en euros, arrondis à l'affichage | Lecture du code | Cohérent | Cohérent | Conforme | — |
| C54 | Retrait supérieur au solde | Plafonné au solde, avec avertissement | Calcul indépendant | 500 € | 500 € | Conforme | — |
| C55 | Durée nulle | Ramenée à 1 mois | Spec | 1 mois | 1 mois | Conforme | — |
| C56 | PER, âge de départ ≤ âge actuel | Avertissement, simulation sur 1 an | Spec | Avertissement | Avertissement | Conforme | — |
| C57 | PER, âge de fin avant le départ | Avertissement, pas de rente | Spec | Avertissement | Avertissement | Conforme | — |
| C58 | Fourchette basse des UC | Rendement − écart du profil | Spec | 10 100 € | 10 100 € | Conforme | — |

## 4. Analyse des anomalies

**C32, économie d'impôt du PER (élevée).** Le calcul applique la TMI de l'année à tout le versement. C'est juste tant que le revenu, une fois diminué du versement, reste dans la même tranche. Dans le cas testé (couple, 70 000 €, quotient de 35 000 €), un versement de 20 000 € fait passer le quotient à 25 000 € : seuls 5 421 € × 2 parts sont déduits à 30 %, le reste à 11 %. Le profil connaît le revenu et les parts, l'économie exacte peut donc être calculée. Sans revenu renseigné, l'approximation devrait être signalée.

**C34, sortie en capital du PER (élevée).** Les versements déduits récupérés en capital s'ajoutent aux revenus de l'année de sortie. Une grosse sortie fait donc monter le foyer de plusieurs tranches. Appliquer la seule TMI à la retraite sous-estime fortement l'impôt et favorise la sortie en capital face à la rente dans la comparaison. À vérifier : la possibilité d'utiliser le système du quotient (revenu exceptionnel), qui réduirait l'écart sans le supprimer.

**C39, montant de la rente (élevée).** La formule actuelle (annuité certaine sur l'espérance de vie INSEE du moment) diffère du calcul des assureurs sur deux points :
- les tables réglementaires (TGF05) sont générationnelles et plus prudentes, et donnent environ 25 à 30 ans à 64 ans, contre 22 ans ici ;
- une rente viagère se calcule en probabilisant chaque échéance.

Le résultat (4,72 %) dépasse toute la fourchette constatée (3,1 à 4,3 %). Le paramètre par défaut de 86 ans devrait au moins être recalé sur les taux de conversion du marché.

**C33, déblocage anticipé (moyenne).** Après un déblocage, le code réduit les versements de l'année pris en compte pour la déduction (`yearDeposits *= 1 − ratio`). La déduction fiscale porte pourtant sur les sommes versées, pas sur le solde.

**C14 et C13, livret bancaire (moyenne et faible).** Les intérêts sont capitalisés bruts et l'impôt est considéré comme payé à part, alors que la banque retient l'impôt et les prélèvements sociaux lors de l'inscription des intérêts. La vue nette reste proche (+0,2 % sur 10 ans), mais la vue brute affiche un solde qui n'existe pas.

**C25, contrat d'assurance vie existant (moyenne).** Le capital initial d'un contrat déjà ouvert est traité comme s'il n'avait aucune plus-value latente. Il faudrait un champ « total des versements effectués » pour calculer correctement les produits imposables.

**C18, fonds euros (faible).** Écart de 0,02 point par an entre la soustraction des frais et leur application multiplicative. Négligeable, mais il peut être aligné.

**C40, espérance de vie (faible).** Une seule valeur (86 ans) quel que soit l'âge de départ : la durée de rente est trop courte pour un départ tardif.

## 5. Points à vérifier sur sources officielles

- C15 : modalités de l'option barème pour les intérêts de livrets (acompte, CSG déductible).
- C23 : assiette de l'IR au rachat sur le fonds euros (produits avant ou après les prélèvements sociaux annuels), dans le BOFiP BOI-RPPM-RCM-20-10-20-50.
- C26 : appréciation du seuil de 150 000 € tous contrats confondus.
- C31 : libellés de l'avis d'impôt pour le plafond épargne retraite.
- C34 : application du système du quotient à la sortie en capital du PER.
- C41 : plafond de l'abattement de 10 % sur les pensions pour les revenus 2025.
- C48 : plafond du parent isolé (4 262 € ou 4 224 €), dans la brochure pratique IR 2026.

## 6. Limites de l'audit

- Plusieurs règles reposent sur des sources secondaires concordantes ; le BOFiP et les textes de loi n'ont pas été consultés directement.
- L'interface (affichage, saisie, stockage des profils) n'est pas couverte : seul le moteur de calcul est audité.
- Les cas testés sont représentatifs, pas exhaustifs, sauf la TMI (balayage de 1 170 cas).

## 7. Sources

- [Bercy infos : livret d'épargne bancaire](https://www.economie.gouv.fr/particuliers/livret-epargne-bancaire)
- [Service-Public : PER (F34982)](https://www.service-public.gouv.fr/particuliers/vosdroits/F34982?lang=fr)
- [Service-Public : actualité prélèvements sociaux PER (A18841)](https://www.service-public.gouv.fr/particuliers/actualites/A18841)
- [Bercy infos : quotient familial](https://www.economie.gouv.fr/node/37870)
- [Goodvest : impacts de la loi de finances 2026 sur le PER](https://www.goodvest.fr/blog/plan-epargne-retraite/impacts-loi-finances-2026-per)
- [Moneyvox : la DGFiP confirme l'avantage sur 5 ans du PER](https://www.moneyvox.fr/placement/actualites/107723/epargne-retraite-la-dgfip-confirme-un-avantage-fiscal-sur-5-ans-du-per-moins-genereux-que-prevu)
- [Infoper : calendrier d'expiration des plafonds](https://infoper.fr/blog/plafond-per-non-utilise-2026-report-3-ans-5-ans-calendrier-expiration)
- [Selectra : règle des quinzaines du Livret A](https://selectra.info/finance/actualites/bons-plans/livret-a-erreur-a-eviter-en-fin-d-annee-sinon-vous-perdez-des-interets)
- [Moneyvox : calcul des intérêts d'un livret](https://www.moneyvox.fr/livret/calcul-interets.php)
- [AXA : fiscalité de l'assurance vie (juin 2026)](https://media.axa.fr/content/dam/axa-fr/image/particuliers/epargne/documents-pdf/fiscalite-CAV-juin-26.pdf)
- [AFER : fiscalité en cas de rachat](https://www.afer.fr/content/uploads/2022/06/61234a-2206-afer-fiscalit-en-cas-de-rachat.pdf)
- [Fortuneo : fiscalité du PER](https://www.fortuneo.fr/blog/comprendre-fiscalite-per)
- [Invesse : sortie du PER en capital ou en rente](https://invesse.fr/epargne/sortie-per-capital-rente/)
- [Linxea : table de mortalité à l'adhésion ou à la liquidation](https://www.linxea.com/tout-savoir-sur/per/faut-il-preferer-la-table-de-mortalite-en-vigueur-a-ladhesion-ou-a-la-liquidation-de-la-retraite/)
- [Moicombien : quotient familial 2026](https://moicombien.fr/blog/quotient-familial-2026-calcul-plafond-avantage)
- [Fiscaloo : quotient familial](https://www.fiscaloo.fr/13052-quotient-familial/)
- [INSEE : espérance de vie à divers âges](https://www.insee.fr/fr/statistiques/2416631)
