# Audit complet de l'application FoodAI MVP

Date de l'audit: 27 février 2026
Périmètre: dépôt complet `foodai-mvp` (frontend Vite/React/TypeScript)

## 1) Objectif
Ce dossier documente:
- l'architecture réellement en place,
- ce qui existe fonctionnellement,
- tout ce qui est problématique/louche (avec fichiers liés),
- un plan de rectification priorisé.

## 2) Résultats synthétiques
- Build: OK (`npm run build`) mais warning de bundle trop volumineux (`737.84 kB` minifié pour le JS principal).
- Lint: KO (`npm run lint`) avec 1 erreur bloquante dans `src/context/CartContext.tsx` (règle `react-refresh/only-export-components`).
- Cohérence architecture: l'app route/page utilise majoritairement `MOCK_*` directement au lieu des hooks/services prévus.
- Qualité CSS:
  - variables CSS référencées mais non définies: `--shadow-xl`, `--font-size-md`,
  - nombreuses classes utilitaires style Tailwind utilisées sans Tailwind dans les dépendances.

## 3) Documents du dossier
- `architecture-existante.md`: vue technique détaillée (stack, couches, flux, dépendances).
- `fonctionnel-existant.md`: inventaire fonctionnel page par page / composant par composant.
- `registre-problemes.md`: liste détaillée des anomalies, risques, incohérences et zones louches (avec fichiers/ligne).
- `plan-rectification.md`: plan d'action priorisé (P0/P1/P2) pour remise à niveau.

## 4) Méthode
- Lecture complète de la base `src/` (pages, composants, contexts, hooks, services, types, styles, mock data).
- Vérifications automatiques:
  - `npm run build`
  - `npm run lint`
- Vérifications structurelles:
  - recherche usages hooks/services vs imports mock,
  - détection de classes CSS potentiellement non définies,
  - détection de variables CSS non définies.

## 5) Conclusion rapide
Le projet est un MVP de démonstration visuellement riche, mais avec un écart important entre l'architecture "prévue" (services + hooks) et l'exécution réelle (mock direct dans les pages). La base est exploitable, mais nécessite une phase de fiabilisation avant toute mise en production.
