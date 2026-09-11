# KOOK.IA — cadrage technique et développement

> Version nettoyée : technologies, développement et validation uniquement.
> Les éléments métier, marketing, UX, direction artistique et financiers sont
> volontairement retirés.

## 1. État actuel du dépôt

Le MVP actuel est un frontend React/TypeScript utilisant des données mockées
localement. Il ne contient pas encore d'API, de base de données serveur ni
d'intégration POS/OCR réelle.

| Domaine | Technologies / état |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Visualisation | Recharts |
| Tests | Vitest |
| Qualité | ESLint, TypeScript, GitHub Actions |
| Déploiement frontend | Vercel |
| Données actuelles | Mocks locaux, servis par les services frontend |

## 2. Stack cible de préproduction

| Besoin | Technologie ou approche prévue |
| --- | --- |
| API backend | Node.js, Express, TypeScript |
| Base de données | PostgreSQL |
| ORM et migrations | Prisma |
| Hébergement | Frontend Vercel ; infrastructure cloud louée au lancement |
| POS | Adaptateur API de caisse ; Lightspeed est l'intégration prioritaire visée |
| Import alternatif | Photo de Ticket Z |
| OCR | Service externe, avec stub initial et correction manuelle ; AWS Textract est cité dans le chiffrage |
| Prévisions | Historique des ventes, météo locale et calendrier événementiel |
| IA prédictive | Hors périmètre full-stack initial ; service externe/stub pendant le MVP technique |

Supabase est cité dans l'estimation de coûts initiale. L'architecture de
préproduction décrite dans ce cadrage retient toutefois PostgreSQL avec Prisma :
ce choix doit être confirmé avant l'implémentation afin d'éviter deux couches de
persistance concurrentes.

## 3. Architecture cible

```text
React UI
  → pages / composants
  → hooks / features
  → services
  → API Express TypeScript
  → domaine métier
  → PostgreSQL via Prisma

Services externes : POS, OCR Ticket Z, météo, calendrier événementiel
```

La migration doit se faire progressivement, service par service, en conservant
les hooks comme façade UI tant que possible. Les DTO d'API et données des
fournisseurs doivent être mappés avant d'entrer dans le domaine métier.

## 4. Données et règles de développement

Entités initiales prévues :

- `Restaurant`
- `Product`
- `StockItem`
- `SalesSnapshot`
- `Prediction`
- `Recommendation`
- `ValidationLog`
- `ReportMetric`

Règles incontournables :

- Une recommandation est une suggestion : le chef peut la modifier puis doit la
  valider explicitement.
- La validation est journalisée de bout en bout dans `ValidationLog`.
- Une importation POS ou OCR ne crée jamais une commande validée automatiquement.
- Sous 90 % de confiance OCR, une correction manuelle assistée est demandée.
- En cas d'indisponibilité du POS, l'application doit proposer un fallback.
- Les données POS, photos Ticket Z et identifiants d'intégration sont des entrées
  externes à valider ; aucun secret ne doit être exposé côté frontend.

## 5. Plan de développement

| Sprint | Objectif | Critère de sortie |
| --- | --- | --- |
| S0 — cadrage technique | Backlog, conventions, README, CI | Environnement installable, CI verte |
| S1 — socle API | Express/TypeScript, endpoint de santé, tests | API locale fonctionnelle |
| S2 — données métier | PostgreSQL/Prisma ; restaurant, produit, stock | CRUD minimal testé |
| S3 — recommandations contrôlées | Prévision, modification, validation, journalisation | Aucune validation sans trace |
| S4 — POS et OCR | Adaptateur POS, Ticket Z, stub OCR, fallback | Flux démontrable sans moteur IA |
| S5 — robustesse | KPI, export, accessibilité, états vides | Scénarios critiques testés |
| S6 — préproduction | Déploiement, smoke tests, documentation, démo | Version stable sur URL dédiée |

Une story de plus de 8 points est à découper. La capacité cible est de 15 à 20
points par sprint de deux semaines, hors moteur IA.

## 6. Tests et critères de qualité

Commandes à maintenir vertes :

```bash
npm run lint
npm run build
npm run test
```

Priorités de test :

1. Règles unitaires : stock critique/surstock, recommandations, modification,
   validation et données incomplètes.
2. Intégrations : chargement dashboard, états vides, persistance des seuils,
   import Ticket Z, indisponibilité POS et absence de secrets dans le bundle.
3. Parcours utilisateur : Dashboard → Stocks → Predictions → Validation,
   navigation clavier et démonstration de préproduction.

À partir de S3, l'objectif est d'atteindre au minimum 70 % de couverture sur les
services critiques. Chaque correction de bug sur une règle critique doit ajouter
un test de non-régression.

## 7. Périmètre différé

- Moteur IA prédictif et OCR en production.
- Exports de gaspillage AGEC et suggestions de menus sur surstocks : après le
  MVP technique.
- EDI fournisseurs et enregistrement réglementaire HACCP : après le MVP.
- Infrastructure dédiée et machine IA : option de montée en charge, non prévue
  au lancement cloud.

## 8. Décision à prendre avant de planifier

Le périmètre produit décrit Lightspeed et l'OCR Ticket Z comme prioritaires,
alors que certaines stories de backlog les classent plus bas. L'équipe doit
trancher cette priorité avant de figer les sprints et de choisir les fournisseurs
d'intégration.
