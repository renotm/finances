# Suivi de la fiabilisation (AUDIT_PLAN.md)

> Branche de travail : `fiabilisation` (créée depuis `profils`, commit `c02c3a6`).
> Ce fichier permet de reprendre le travail : il liste l'état de chaque phase, les anomalies traitées, les tests associés et les limites restantes.
> Les règles fiscales, formules et sources sont détaillées dans `FISCAL_RULES.md`.

## État des phases

| Phase | Objet | État |
|---|---|---|
| 0 | Analyse du code et plan d'implémentation | terminée |
| 1 | Moteur fiscal commun | terminée |
| 2 | Corrections du PER | terminée |
| 3 | Corrections de l'assurance vie | terminée |
| 4 | Corrections des livrets | en cours |
| 5 | Cohérence des comparaisons | à faire |
| 6 | Validation automatisée | à faire |

## Phase 0 : plan d'implémentation

**Constat sur le code existant**
- Le moteur (`src/engine`) est en TypeScript pur, testé par Vitest ; chaque placement est un module qui déclare ses paramètres et sa fonction `simulate`.
- La fiscalité est dispersée : chaque produit applique un taux (TMI, PFU, prélèvements sociaux) à une assiette. Il n'existe pas de calcul de l'impôt lui-même, seulement de la TMI (`src/engine/tax/incomeTax.ts`).
- Le profil (`src/profiles`) transmet aux colonnes une TMI ou un calendrier de TMI, pas la situation fiscale complète.

**Plan**
1. Phase 1 : `src/config/fiscal.ts` centralise et date tous les paramètres fiscaux. `src/engine/tax/incomeTax.ts` devient un moteur d'impôt complet : barème, quotient familial et plafonnement, décote, parent isolé ou concubinage, abattement sur les pensions, système du quotient, impôt supplémentaire d'un revenu, économie d'une déduction. Un « contexte fiscal » (situation, enfants, revenus actuels et à la retraite) est transmis aux colonnes par le profil (format de stockage v2 avec migration). Sans contexte, la TMI manuelle reste utilisable et les résultats sont marqués approximatifs.
2. Phase 2 : réécriture de la fiscalité du PER sur ce moteur (économie d'impôt réelle, sortie en capital au barème avec système du quotient, déblocages selon le motif, limite de 70 ans, plafond nul, reports dynamiques, mutualisation, rente actuarielle sur la table TGF05, abattement sur les pensions plafonné, comparaison rente / capital).
3. Phase 3 : assurance vie (frais multiplicatifs, contrats existants avec primes et plus-values latentes, primes avant le 27/09/2017, ordre des abattements, seuil de 150 000 € tous contrats au 31/12 précédent).
4. Phase 4 : livrets (retenue à la source des livrets bancaires, solde réel, option barème avec CSG déductible, arrondis).
5. Phase 5 : indicateurs de comparaison (effort d'épargne, horizon, capital disponible, économies d'impôt réinvesties ou non, valeur actualisée, rendement réel, TRI multiple, hypothèses).
6. Phase 6 : tests indépendants, propriétés de conservation, cohérence affichage / moteur.

**Règles vérifiées pour l'ensemble du plan** : voir `FISCAL_RULES.md` (sources Service-Public, Bercy infos, BOFiP cité, loi de finances 2026).

## Phase 1 : moteur fiscal commun (terminée)

**Réalisé**
- `src/config/fiscal.ts` : tous les paramètres fiscaux centralisés et datés (barème, quotient familial, décote, abattement sur les pensions, système du quotient, PFU, prélèvements sociaux, PER, assurance vie, table TGF05, âges des enfants). `defaults.ts` ne garde que les valeurs de marché et les hypothèses.
- `src/engine/tax/incomeTax.ts` : impôt complet (barème, plafonnement du quotient familial, décote), parent isolé seulement s'il vit seul, impôt supplémentaire d'un revenu, économie d'une déduction, système du quotient (minimum entre direct et quotient), abattement de 10 % sur les pensions avec plancher et plafond, part imposable d'une pension supplémentaire.
- `TaxContext` (types) et `src/engine/tax/context.ts` : contexte fiscal complet transmis aux colonnes par le profil (`taxContext`). Sans contexte, la TMI saisie reste utilisée (résultats signalés approximatifs à partir de la phase 2).
- Profil : nouveaux champs (vit seul, revenu imposable et pensions à la retraite, plafond du conjoint) avec saisie dans la page des profils.
- Stockage des profils v2 : migration v1 → v2 sans perte ; un format illisible ou plus récent n'est plus jamais écrasé (auparavant, une version inconnue était remplacée par une liste vide à la première sauvegarde).

**Tests** : `tests/tax.test.ts` (barème, décote personne seule et couple, décote plafonnée à l'impôt, plafonnement, concubinage, économie d'une déduction, système du quotient, abattement sur les pensions, migration des profils). 79 tests passent, build OK.

**Écart constaté sur l'audit** : l'économie d'impôt de C32 vaut 4 409,01 € et non 4 259,98 € : l'audit ignorait la décote, qui s'applique après la déduction (impôt brut de 2 948 €). Le test retient la valeur calculée avec la décote.

**Note d'environnement** : sous Windows, Vitest doit être lancé depuis `D:\Perso\finances` (lettre de lecteur en majuscule) ; depuis `d:\…`, le module `vitest` est chargé deux fois et toutes les suites échouent (« failed to find the current suite »).

## Phase 2 : PER (terminée)

| Anomalie (AUDIT.md / plan) | Correction | Test(s) |
|---|---|---|
| C32 économie d'impôt = versement × TMI | impôt(revenu) − impôt(revenu − déduction) avec le contexte fiscal ; TMI fixe signalée « approximative » sinon | `fiscalité réelle… économie d'impôt` (4 409,01 €), `sans contexte… approximatif` |
| C33 déblocage réduisant la déduction | la déduction porte sur les versements effectués | `un déblocage ne réduit pas la déduction` (1 413 €) |
| C34 sortie en capital à taux unique | barème dans la catégorie des pensions, sans abattement, système du quotient | `sortie en capital au barème avec le système du quotient` (42 440 €) |
| C39 rente surestimée | rente = capital ÷ prix d'un euro de rente TGF05 à 0 % (tarif 1/1/2026), décalage d'âge si table non garantie ; estimation signalée non contractuelle | `rente viagère estimée sur la table TGF05` (7 tests, dont taux implicite dans la fourchette du marché) |
| C40 espérance de vie fixe | la table donne un prix par âge de départ ; la durée de vie supposée ne sert plus qu'à l'horizon d'affichage | `prix interpolé entre deux âges` |
| C41 abattement sur les pensions non plafonné | abattement de 10 % avec plancher et plafond du foyer, compte tenu des pensions saisies | `rente : abattement de 10 % plafonné` |
| Plan : déblocage selon le motif | résidence principale (imposé) / accident de la vie (exonéré d'IR, prélèvements sociaux sur les gains) | `accident de la vie… résidence principale` |
| Plan : versements après 70 ans | non déductibles depuis 2026, avertissement | `versements à partir de 70 ans` |
| Plan : plafond nul | case « Saisir le plafond », zéro accepté, avertissement | `plafond nul saisi` |
| Plan : reports dynamiques | champs N−1 à N−5 affichés selon leur validité à la date de début | `champs de report visibles selon leur validité` |
| Plan : mutualisation | plafond du conjoint après les reports | `mutualisation` |
| Plan : âges des rentes | fraction imposable selon l'âge révolu (69,5 ans → 40 %) | `fraction imposable selon l'âge révolu` |
| Plan : comparaison rente / capital | comparaison au capital net d'impôt de la même part | `comparaison avec la même part prise en capital` |

**Tests existants remplacés** : les 6 tests de la rente qui figeaient l'ancienne méthode (annuité certaine sur l'espérance de vie, taux technique 0,5 %) ont été réécrits avec des attendus recalculés à partir des prix publiés de la table TGF05. L'ancien test « taux de conversion » attendait un abattement de 10 % appliqué sans plafond ; il attend désormais 10 % sans plancher (pensions inconnues), conformément à l'hypothèse documentée.

**Limites restantes** : âge du conjoint inconnu pour la mutualisation ; interaction capital / rente la même année non cumulée ; table TGF05 disponible seulement à taux technique 0 % et pour les âges 55 à 80 ans.

91 tests passent, build OK.

## Phase 3 : assurance vie (terminée)

| Anomalie (AUDIT.md / plan) | Correction | Test(s) |
|---|---|---|
| C18 frais du fonds euros (audit : appliquer les frais en multiplicatif) | **Non retenue après vérification** : le taux servi est le rendement après frais sur encours (soustraction) ; documenté | `fonds euros : intérêts nets de frais` |
| Plan : brut / net de frais, pas de double déduction | rendement brut et frais distincts dans les lignes annuelles ; frais prélevés une seule fois sur l'encours | idem, `unités de compte` |
| C23 assiette de l'IR | produits = montant racheté − quote-part des primes (CGI 125-0 A), nets des prélèvements annuels ; à confirmer au BOFiP | `rachat avant 8 ans : 12,8 % sur les produits` |
| C25 contrat existant | champs « versements nets restant » et « dont avant 2017 » ; plus-values latentes imposées ; avertissement si inconnu | `contrat existant`, `versements non renseignés` |
| Plan : primes avant le 27/09/2017 | 35 % / 15 % / 7,5 % selon la durée | `primes avant 2017…`, `contrat de moins de 8 ans` |
| Plan : ordre des abattements | primes anciennes, puis 7,5 %, puis 12,8 % | `ordre de l'abattement` |
| C26 seuil de 150 000 € | tous contrats de l'assuré (champ « autres contrats »), au 31/12 de l'année précédente, primes anciennes déduites | `seuil de 150 000 €`, `autres contrats`, `seuil apprécié au 31 décembre` |
| Plan : rachats multiples | abattement consommé une seule fois par an | `rachats multiples la même année` |

**Tests existants corrigés** :
- `rachat avant 8 ans` attendait un impôt sur les produits avant prélèvements sociaux annuels (260 €). Il attend désormais l'assiette légale nette (215,28 €).
- `après 8 ans, au-delà de 150 000 €` appliquait l'abattement au prorata des deux taux (2 578,10 €). Il l'applique désormais dans l'ordre réglementaire, d'abord sur la part à 7,5 % (2 700 €).

**Limites restantes** : trois règles « à confirmer » au BOFiP (assiette nette, ordre de l'abattement, primes anciennes dans le seuil), voir FISCAL_RULES.md §4.

100 tests passent, build OK.

## Journal

- Création de la branche `fiabilisation` et de ce fichier.
- Vérification des règles : décote 2026, abattement de 10 % sur les pensions (454 € / 4 439 €), sortie en capital du PER (régime des pensions sans abattement, système du quotient), versements PER après 70 ans (LF 2026 art. 9), mutualisation (case 6QR), déblocages anticipés selon le motif, assurance vie (primes avant 2017, ordre des abattements, seuil de 150 000 €), livret bancaire (acompte, option barème, CSG déductible), parent isolé et concubinage, table TGF05 à 0 % (tarif 1/1/2026).
