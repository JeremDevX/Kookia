# Référentiel technique et développement

## Objet et statut

Ce document consolide les contraintes techniques et de développement du
[Jalon 2](../jalon2.md) avec l'état observable du dépôt. Il est la référence
pour le cadrage technique : **une cible planifiée ne décrit pas une
fonctionnalité déjà disponible**.

| Sujet | État actuel vérifié | Cible Jalon 2 / préproduction |
| --- | --- | --- |
| Application web | React 19, TypeScript, Vite ; données métier persistées via API | Conserver les hooks comme façade UI pendant une migration progressive |
| Qualité | ESLint, TypeScript, Vitest et CI GitHub Actions ; scripts `lint`, `build`, `test` | CI exécutable sans manipulation ; smoke test sur URL dédiée avant recette |
| Hébergement | Configuration frontend Vercel (`vercel.json`) | Préproduction puis recette avant lancement commercial |
| Backend et persistance | API Express/TypeScript et PostgreSQL/Prisma actifs pour comptes et espaces métier isolés | Étendre progressivement les frontières métier vers PostgreSQL/Prisma |
| Intégrations | POS/OCR absents ; disponibilité réelle explicitée, saisie manuelle des factures | Adaptateur POS, import Ticket Z, service OCR externe avec fallback |
| Prévision | Règles déterministes et prévisions de démonstration persistées | Historique de ventes, météo locale et calendrier événementiel ; moteur IA hors périmètre full-stack initial |

Les versions et dépendances actives font foi dans [`package.json`](../package.json).

## Invariants produit et données

- KOOK.IA **suggère** : le chef relit, peut modifier et valide explicitement une
  recommandation. L'automatisation opaque de commande est hors périmètre.
- La persistance journalise la validation des commandes et menus par le chef ;
  une importation POS ou OCR ne vaut jamais validation.
- Les recommandations doivent rendre lisibles les données et incertitudes qui
  influencent matériellement une décision.
- Pour le flux Ticket Z envisagé, une lecture OCR sous 90 % de confiance appelle
  une correction manuelle assistée. C'est une règle cible, non une capacité
  observée du frontend actuel.
- Données POS, images Ticket Z et identifiants de fournisseurs sont des entrées
  externes non fiables : validation, contrôle d'accès, minimisation de stockage
  et absence de secrets côté client sont requis lorsque ces flux existent.

## Modèle cible et frontières

Les contrats initiaux prévus sont : `Restaurant`, `Product`, `StockItem`,
`SalesSnapshot`, `Prediction`, `Recommendation`, `ValidationLog` et
`ReportMetric`. Ils devront rester distincts des DTO de transport et des
payloads de fournisseurs lorsque leurs formes divergent.

```text
UI React → hooks/features → client API → API Express → domaine → PostgreSQL
                                  ↘ adaptateurs POS / OCR / météo / calendrier
```

La persistance active couvre `User`, `Session`, `Restaurant`, `Supplier`,
`Product`, `Recipe`, `RecipeIngredient`, `StockMovement`, `Production`,
`Prediction`, `PurchaseOrder`, `PurchaseOrderLine`, `RecommendationDecision`
et `WorkspaceDocument`. Ce dernier conserve les documents structurés (analytics,
préférences, panier, notifications, factures et menus), validés aux frontières.
Les mutations critiques sont transactionnelles. Les liens internes sont différés
pour permettre la suppression en cascade d’un compte sans casser ses références.

Le seed ne recrée pas les données à chaque chargement : `npm run db:seed` initialise
les comptes existants sans écrasement ; les nouveaux espaces sont initialisés au
premier accès. Les dates des prévisions de démonstration sont figées. Aucun calcul
IA, connecteur POS/OCR ou envoi fournisseur réel n’est impliqué par la persistance.
Le [plan de migration](plans/database-migration.md) contient la cartographie et les
preuves de validation, ainsi que les vérifications encore ouvertes.

## Backlog et séquence de référence

| Séquence | Résultat attendu |
| --- | --- |
| S0 — cadrage | Backlog, conventions, README et CI ; environnement installable |
| S1 — socle API | API Express/TypeScript, santé et tests |
| S2 — données métier | PostgreSQL/Prisma ; restaurant, produit et stock minimum |
| S3 — recommandations contrôlées | Prévision, modification, validation chef et journal de décision |
| S4 — ingestion | Adaptateur POS, Ticket Z, stub OCR et fallback démontrable |
| S5 — robustesse | KPI, export, accessibilité, états vides et scénarios critiques |
| S6 — préproduction | Déploiement, smoke tests, documentation, démonstration et recette |

Une story estimée au-delà de 8 points doit être découpée ; la capacité visée est
de 15 à 20 points par sprint de deux semaines, hors moteur IA.

## Validation attendue

Les contrôles actuels sont :

```bash
npm run lint
npm run build
npm run test
```

Pour la cible préproduction, compléter progressivement avec des tests unitaires
des règles métier (stocks, recommandations, validation, données incomplètes),
des tests d'intégration des erreurs/fallbacks (POS, OCR, persistance) et un
parcours utilisateur Dashboard → Stocks → Predictions → Validation, clavier et
états vides compris. L'objectif de 70 % concerne les services critiques à partir
de S3 ; il ne mesure pas la couverture actuelle sans rapport généré.

## Éléments hors périmètre ou différés

- Production du modèle prédictif et de l'OCR : services externes/stubs pendant
  le périmètre full-stack initial.
- Rapports de gaspillage AGEC et suggestions de menus sur surstocks : cible
  *Should have* à T+9 mois. Ne pas revendiquer une conformité réglementaire sans
  vérification dédiée.
- EDI fournisseurs et enregistrement HACCP : cible *Could have* à T+12 mois.
- Infrastructure dédiée et machine IA : option de montée en charge vers 100
  clients, chiffrée comme enveloppe haute à confirmer par devis ; le scénario de
  départ reste le cloud loué.

## Décisions à trancher avant planification

Le cadrage produit classe la connexion native Lightspeed et l'ingestion OCR
Ticket Z comme *Must have*, alors que le backlog de développement place
l'adaptateur POS et les stories OCR en *Could/Should*. Cette divergence doit être
arbitrée par l'équipe avant de figer un sprint ou un engagement externe. Il faut
également préciser le fournisseur POS, les conditions d'accès aux données et la
politique de conservation des images Ticket Z avant toute intégration.
