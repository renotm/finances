Réalise une dernière phase de correction ciblée sur la branche fiabilisation.

Ne procède à aucune refonte générale.

### Corrections

1. Corriger la fiscalité des déblocages anticipés du PER effectués durant l'année du versement. Les versements fiscalement déduits ne doivent pas échapper à l'imposition du retrait sous prétexte que leur reclassement intervient en décembre.

2. Vérifier la gestion des rachats partiels d'assurance vie lorsque le contrat est en moins-value, conformément au BOFiP BOI-RPPM-RCM-20-10-20-50.

3. Vérifier le calcul de l'abattement sur les pensions lorsque les deux conjoints sont pensionnés.

4. Vérifier les limites de détection des TRI multiples et documenter les limites numériques de l'algorithme.

5. Ne pas présenter la valeur actualisée comme suffisante pour comparer des placements d'horizons différents.

### Sources officielles complémentaires vérifiées

**Ordre des abattements :**
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044989424/2026-07-16

**Seuil assurance vie de 150 000 € :**
https://bofip.impots.gouv.fr/bofip/11224-PGP.html/identifiant=BOI-RPPM-RCM-20-15-20210621

**CSG déductible :**
https://www.service-public.gouv.fr/particuliers/vosdroits/F2329

**Plafond du parent isolé :**
https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/21-calcul_impot_369a382.pdf

**Plafonds PER sur l'avis d'impôt :**
https://www.impots.gouv.fr/particulier/questions/que-signifie-la-somme-imprimee-dans-la-rubrique-plafond-epargne-retraite-de

Mettre à jour FISCAL_RULES.md avec ces références officielles.

L'assiette de l'impôt sur le revenu des rachats d'assurance vie après prélèvements sociaux reste à confirmer.

Ajouter des tests indépendants couvrant chaque correction, notamment l'impôt du retrait PER et pas uniquement son économie fiscale.

Mettre à jour SPEC.md et AUDIT_REMEDIATION.md. Exécuter les tests, le typage et le build. Ne modifier ni le design ni les fonctionnalités non concernées.