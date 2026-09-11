# Référentiel technique et développement

## Objet et statut

Ce document consolide les contraintes techniques et de développement du
[Jalon 2](../jalon2.md) avec l'état observable du dépôt. Il est la référence
pour le cadrage technique : **une cible planifiée ne décrit pas une
fonctionnalité déjà disponible**.

| Sujet | État actuel vérifié | Cible Jalon 2 / préproduction |
| --- | --- | --- |
| Application web | React 19, TypeScript, Vite ; données locales mockées | Conserver les hooks comme façade UI pendant une migration progressive |
| Qualité | ESLint, TypeScript, Vitest et CI GitHub Actions ; scripts `lint`, `build`, `test` | CI exécutable sans manipulation ; smoke test sur URL dédiée avant recette |
| Hébergement | Configuration frontend Vercel (`vercel.json`) | Préproduction puis recette avant lancement commercial |
| Backend et persistance | Absents | Node.js/Express avec TypeScript, PostgreSQL et Prisma |
| Intégrations | Absentes ; les écrans d'intégration sont des mocks | Adaptateur POS, import Ticket Z, service OCR externe avec fallback |
| Prévision | Règles et données de démonstration locales | Historique de ventes, météo locale et calendrier événementiel ; moteur IA hors périmètre full-stack initial |

Les versions et dépendances actives font foi dans [`package.json`](../package.json).

## Invariants produit et données

- KOOK.IA **suggère** : le chef relit, peut modifier et valide explicitement une
  recommandation. L'automatisation opaque de commande est hors périmètre.
- La future persistance doit journaliser de bout en bout la décision du chef ;
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
UI React → hooks/features → services → API Express → domaine → PostgreSQL
                                  ↘ adaptateurs POS / OCR / météo / calendrier
```

Cette cible ne justifie pas d'ajouter aujourd'hui un serveur, un client HTTP ou
des abstractions de transport au frontend mocké. Lorsqu'une migration est
autorisée, basculer une frontière à la fois, maintenir le contrat des hooks si
possible, valider les payloads à l'entrée et mapper les données externes avant
le domaine.

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
