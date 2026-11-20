# Simulateur de placements

Page web statique pour simuler et comparer jusqu'à 3 placements : Livret A, LDDS, livret bancaire (type Bourso+), assurance vie, PER.
Spécification complète : [SPEC.md](SPEC.md).

## Démarrer

Node 24 requis.

```bash
npm install
npm run dev        # serveur de développement (http://localhost:5173)
npm test           # tests du moteur de calcul
npm run build      # build statique dans dist/
npm run preview    # sert dist/ en local
```

## Mettre à jour les taux et barèmes

Toutes les valeurs par défaut sont dans [src/config/defaults.ts](src/config/defaults.ts). Pensez à mettre à jour `updatedAt`, affiché en pied de page.

## Ajouter un placement

1. Créer un module dans `src/engine/products/` qui implémente l'interface `Product` (`src/engine/types.ts`) : schéma de paramètres, valeurs par défaut, fonction `simulate`.
2. L'inscrire dans `src/engine/registry.ts`.
3. Ajouter ses libellés dans `src/i18n/fr.ts` et `src/i18n/en.ts` (`products`, `params`, `options`…).
4. Ajouter ses tests dans `tests/`.

Le formulaire est généré à partir du schéma : aucune modification de l'interface n'est nécessaire.

## Structure

```
src/config/      valeurs par défaut
src/engine/      moteur de calcul (TypeScript pur, testé)
  core/          calendrier, quinzaines, contrat multisupport, TRI
  products/      un module par placement
src/ui/          composants Vue
src/i18n/        traductions FR / EN
tests/           tests Vitest
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` teste, construit et publie sur GitHub Pages à chaque push sur `main`
(activer Pages avec la source « GitHub Actions » dans les réglages du dépôt).
Le dossier `dist/` utilise des chemins relatifs et peut être déposé sur n'importe quel hébergeur statique.
