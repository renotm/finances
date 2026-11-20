# Suivi de la fiabilisation (AUDIT_PLAN.md)

> Branche de travail : `fiabilisation` (créée depuis `profils`, commit `c02c3a6`).
> Ce fichier permet de reprendre le travail : il liste l'état de chaque phase, les anomalies traitées, les tests associés et les limites restantes.
> Les règles fiscales, formules et sources sont détaillées dans `FISCAL_RULES.md`.

## État des phases

| Phase | Objet | État |
|---|---|---|
| 0 | Analyse du code et plan d'implémentation | terminée |
| 1 | Moteur fiscal commun | terminée |
| 2 | Corrections du PER | en cours |
| 3 | Corrections de l'assurance vie | à faire |
| 4 | Corrections des livrets | à faire |
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

## Journal

- Création de la branche `fiabilisation` et de ce fichier.
- Vérification des règles : décote 2026, abattement de 10 % sur les pensions (454 € / 4 439 €), sortie en capital du PER (régime des pensions sans abattement, système du quotient), versements PER après 70 ans (LF 2026 art. 9), mutualisation (case 6QR), déblocages anticipés selon le motif, assurance vie (primes avant 2017, ordre des abattements, seuil de 150 000 €), livret bancaire (acompte, option barème, CSG déductible), parent isolé et concubinage, table TGF05 à 0 % (tarif 1/1/2026).
