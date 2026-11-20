# Fiabilisation fonctionnelle et financière de l'application

## Objectif

Améliorer l'exactitude mathématique, financière et fiscale du simulateur de placements en s'appuyant sur l'audit `AUDIT.md` et les anomalies complémentaires détaillées ci-dessous.

La branche `profils` constitue la base de travail.

L'objectif est d'obtenir un simulateur suffisamment fiable pour comparer différents placements dans le cadre de décisions patrimoniales réelles.

## Contraintes impératives

- Conserver l'architecture technique actuelle dans la mesure du possible.
- Préserver toutes les fonctionnalités existantes.
- Ne pas modifier l'identité graphique de l'application.
- Ne modifier l'interface que lorsque de nouvelles données sont nécessaires à l'exactitude des calculs.
- Préserver la compatibilité avec les simulations et profils déjà enregistrés.
- Ne jamais supprimer silencieusement des données existantes.
- Ne pas introduire de régression fonctionnelle.
- Ne pas considérer les spécifications et tests existants comme nécessairement corrects.
- Vérifier chaque règle fiscale auprès de sources officielles françaises : BOFiP, Légifrance, impots.gouv.fr, Service-Public.
- Ne pas inventer de règle financière ou fiscale lorsque les informations sont insuffisantes.

## Phase 1 — Moteur fiscal commun

Créer un véritable moteur fiscal indépendant et réutilisable par les différents produits financiers.

Il doit notamment gérer :

- Le barème progressif de l'impôt sur le revenu.
- Le quotient familial et son plafonnement.
- La décote.
- La situation familiale.
- La distinction entre parent isolé et parent vivant en concubinage.
- L'évolution de la composition du foyer fiscal.
- Les abattements applicables et leurs plafonds.
- Le système du quotient pour les revenus exceptionnels lorsqu'il est applicable.
- Le calcul de l'impôt supplémentaire généré par un revenu.
- Le calcul de l'économie d'impôt générée par une déduction.

Transmettre le contexte fiscal complet aux moteurs de simulation, et non uniquement la TMI.

Conserver la possibilité d'utiliser une TMI manuelle lorsque le profil fiscal est incomplet, mais identifier clairement les résultats comme approximatifs.

Centraliser et dater l'ensemble des paramètres fiscaux.

## Phase 2 — Corrections du PER

Traiter l'ensemble des anomalies PER identifiées dans `AUDIT.md`, ainsi que les suivantes :

- Calculer l'économie d'impôt réelle par différence entre l'impôt avant et après déduction des versements.
- Calculer l'imposition réelle des sorties en capital au barème progressif.
- Gérer le système du quotient lorsque les conditions légales sont réunies.
- Distinguer les versements déduits, non déduits et les gains.
- Corriger la fiscalité des déblocages anticipés selon leur motif.
- Ne pas réduire artificiellement les versements fiscalement déductibles en cas de retrait.
- Intégrer les restrictions de déductibilité à partir de 70 ans applicables depuis 2026.
- Permettre explicitement la saisie d'un plafond de déduction nul.
- Gérer correctement les reports de plafonds et leurs dates d'expiration.
- Adapter dynamiquement la saisie des plafonds reportés selon l'année.
- Gérer la mutualisation des plafonds entre conjoints.
- Corriger les limites d'âge utilisées pour la fiscalité des rentes.
- Respecter le plafonnement des abattements sur les pensions.
- Améliorer le calcul des rentes viagères en utilisant une méthode actuarielle documentée ou un taux de conversion contractuel fourni par l'utilisateur.
- Ne pas présenter une estimation de rente comme une garantie contractuelle.
- Corriger la comparaison entre sortie en rente et sortie en capital.

## Phase 3 — Corrections de l'assurance vie

Traiter l'ensemble des anomalies assurance vie identifiées dans `AUDIT.md`, ainsi que les suivantes :

- Corriger la capitalisation et l'application des frais.
- Distinguer les rendements bruts et nets de frais de gestion.
- Éviter toute double déduction des frais.
- Prendre en compte les plus-values latentes des contrats existants.
- Distinguer les versements effectués avant et après le 27 septembre 2017.
- Vérifier l'ordre légal d'application des abattements fiscaux.
- Corriger la répartition des produits imposables entre les taux de 7,5 % et 12,8 %.
- Apprécier correctement le seuil de 150 000 € sur l'ensemble des contrats du contribuable concerné.
- Vérifier la fiscalité des rachats partiels et totaux.
- Vérifier l'assiette fiscale des gains après prélèvements sociaux.
- Gérer la consommation de l'abattement annuel lors de rachats multiples.

## Phase 4 — Corrections des livrets

- Corriger la capitalisation des intérêts nets des livrets bancaires fiscalisés.
- Distinguer le solde réel du placement et les projections théoriques brutes.
- Vérifier l'option pour le barème progressif.
- Vérifier la CSG déductible.
- Vérifier les dates de valeur, les quinzaines, les plafonds et les arrondis des livrets réglementés.

## Phase 5 — Cohérence des comparaisons financières

Vérifier et harmoniser les indicateurs entre tous les produits.

- Comparer les placements à effort d'épargne identique.
- Comparer les résultats à horizon temporel identique ou signaler explicitement les différences.
- Distinguer le capital réellement disponible des économies fiscales cumulées.
- Permettre de distinguer les économies fiscales consommées des économies fiscales réinvesties.
- Éviter toute double comptabilisation des capitaux, retraits et rentes.
- Actualiser les flux financiers lorsque des revenus perçus à des dates différentes sont comparés.
- Vérifier le calcul du TRI.
- Détecter les situations dans lesquelles le TRI est multiple, indéterminé ou non pertinent.
- Distinguer rendement nominal et rendement réel après inflation.
- Présenter les scénarios de rendement comme des hypothèses et non comme des probabilités.
- Expliciter l'hypothèse de stabilité des règles fiscales sur les simulations à long terme.

## Phase 6 — Validation automatisée

Créer ou compléter les tests Vitest.

Les résultats attendus doivent être calculés indépendamment du code de production à partir de règles financières documentées.

Ne jamais modifier un résultat attendu simplement pour faire passer un test.

Couvrir notamment :

- Les changements de tranche d'imposition.
- Les seuils fiscaux et leurs bornes.
- Les plafonds nuls.
- Les changements d'année.
- Les changements d'âge.
- Les modifications de composition du foyer fiscal.
- Les versements dépassant les plafonds.
- Les retraits partiels et totaux.
- Les contrats existants.
- Les rendements négatifs ou nuls.
- Les frais supérieurs au rendement.
- Les simulations longues.
- Les incohérences de saisie.
- Les comparaisons entre plusieurs produits.

Ajouter des tests de propriétés mathématiques et de conservation des flux financiers lorsque cela est pertinent.

Vérifier également que les montants affichés dans l'interface, les tableaux et les graphiques correspondent exactement aux résultats du moteur.

## Documentation

Maintenir les fichiers suivants :

- `SPEC.md` : spécifications fonctionnelles corrigées.
- `FISCAL_RULES.md` : règles fiscales, formules, sources officielles et dates d'application.
- `AUDIT.md` : audit initial conservé.
- `AUDIT_REMEDIATION.md` : suivi des corrections, anomalies résolues, tests associés et limites restantes.

Chaque règle non vérifiable doit être identifiée explicitement comme une hypothèse ou une approximation.

## Méthode de travail

Avant toute modification, analyser le code existant et établir un plan d'implémentation.

Traiter ensuite les phases dans l'ordre, sans refonte globale inutile.

Pour chaque phase :

1. Vérifier les règles auprès de sources indépendantes.
2. Identifier les modifications nécessaires.
3. Développer les corrections.
4. Créer les tests associés.
5. Exécuter l'intégralité des tests.
6. Vérifier le build.
7. Mettre à jour les spécifications et le suivi des corrections.

Ne jamais masquer une anomalie en modifiant simplement son affichage.

À la fin, produire un bilan détaillé des corrections effectuées, des tests exécutés et des limitations restantes.