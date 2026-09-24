# Journal de reprise du Goal Kookia

**État initial :** prompt et référentiel préparés ; le Goal de développement
n'a **pas** été lancé dans ce travail documentaire. Ce fichier n'est pas une
preuve que les fonctionnalités cibles sont livrées. Au démarrage, relever date,
branche, `git status`, migrations et tests disponibles sans effacer les
modifications déjà présentes.

## Prochaine action démontrable

Q1, Q1b et C1 sont prouvés localement sur des fixtures synthétiques. Quand un
navigateur est accessible, terminer le contrôle rendu/clavier de C1, puis auditer
les dépendances D2–D6 du [plan d'exécution](plan-execution.md) avant d'ouvrir C2.
Ne pas activer d'OCR ou d'envoi fournisseur dans ces parcours de démonstration.

## Registre des incréments

Pour chaque ID du [plan](plan-execution.md), inscrire **deux axes** : preuve
locale (`à auditer`, `en cours`, `prouvé localement`, `préparé sur fixtures`) et
activation externe (`non applicable`, `non activé`, `activé/évalué sur données
autorisées`, `bloqué externe`). Ne pas remplacer une preuve par une case cochée.
Ajouter les tranches UX transverses en les rattachant au parcours qu'elles
servent. L'agent intégrateur principal édite ce journal ; les sous-agents lui
transmettent leurs preuves sans écrire ici simultanément.

| ID / parcours | Preuve locale | Activation externe | Preuve (tests, rendu, données, fichier) | Limite / suite |
| --- | --- | --- | --- | --- |
| Q1 — garde et base d'intégration isolée | Prouvé localement | Non applicable | Garde URL fail-closed ; migration et 13 fichiers/21 tests sur PostgreSQL jetable ; lint, builds et tests unitaires passent. | Workflow CI ajouté mais non exécuté sur GitHub ; aucune base conservée utilisée. |
| Q1b — bac de scénario jetable | Prouvé localement (fixture seulement) | Non applicable | Fixture synthétique 431 pièces ; plan quatre ans déterministe ; test PostgreSQL crée l'archive et le ledger dans un tenant, une pièce sans mouvement dans un second, et rejoue une réception avec delta unique dans un troisième ; vérifie isolation et suppression en cascade. | Le rejeu est un helper de fixture, pas une garantie de C1 en production. L'histoire navigable reste à construire en C2/C3. CI GitHub non déclenchée ; exclusion sparse-checkout configurée mais non observée à distance. |
| C1 — pièce fournisseur actionnable | Prouvé localement sur fixture synthétique | Non applicable | Revue dans Achats, brouillon lié/historisé, contrôle serveur hash/révision, réception simulée unique et source exposée dans l'historique produit ; preuves PostgreSQL jetables ci-dessous. | Le rendu/clavier n'a pas pu être observé (aucun navigateur accessible par CUA). Pas d'OCR, d'envoi fournisseur ni de rapprochement commande/livraison O2. |
| C2 — chronologie continue | À auditer | Non applicable | — | Simulation existante, scénario UX à prouver. |
| C3 — chaîne métier complète | À auditer | Non applicable | — | Aucune preuve de bout en bout encore consignée ici. |
| UI/KPI/mobile/clavier | À auditer | Non applicable | — | Rendu initial, critique, itération. |
| R0/R1 — local/préproduction | À auditer | Non activé | — | Backend hébergé non défini dans l'état documentaire. |

## Journal de preuves (ajouter une ligne par incrément vérifié)

| Date | ID | Commit local | État avant → après | Commande/test ou scénario UI exécuté | Résultat et limite | Prochaine action |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Q1 | `361add3` (garde), `dd710de` (journal) | Runner direct sans garde → URL locale `kookia_test` obligatoire ; CI configurée sur PostgreSQL éphémère | `node --test scripts/integrationDatabaseGuard.test.mjs` (2/2) ; `npm run test:integration` avec `.env` développement (refus avant démarrage) ; PostgreSQL jetable sans volume : migrations 6/6 et intégration 13 fichiers/21 tests ; `npm run lint`, `npm run build`, `npm run build:api`, `npm test` | Réussite locale. Intégration n'a utilisé que le port aléatoire du conteneur temporaire, supprimé après usage. Action GitHub non exécutée ; cela ne prouve pas un run distant. | Q1b validé sur fixtures ci-dessous ; confirmer le workflow distant lors d'une exécution autorisée. |
| 2026-09-24 | Q1b | `6ea8a3f` (fixtures/tests/CI) | Tests lisant les transcriptions suivies → corpus synthétique déterministe et checkout CI sparse excluant `données restaurants/factures/**` | `npm test` (15 fichiers/74 tests Vitest ; 30 tests Node/CSS), `npm run lint`, `npm run build`, `npm run build:api` ; PostgreSQL jetable sans volume : migrations 6/6, intégration 14 fichiers/22 tests. Le test crée archive+ledger, archive seule et rejeu sur trois owners aléatoires ; le helper de fixture rejoué séquentiellement et concurremment crédite une seule fois ; couverture positive 2024–2026, isolation et suppression en cascade. | Un premier run complet a échoué une fois dans le test Notifications (404) ; son test isolé puis le run complet suivant passent. Résultat final local réussi, avec cette intermittence consignée. Aucun script Camille ni `--write` lancé ; GitHub Actions non exécutée. Le helper n'établit pas C1 en production ni le bac navigable C2/C3. | C1 : relier pièce source au brouillon/reçu sans doubler la pièce déjà créditée. |
| 2026-09-24 | C1 | `42c4fc4` | Archive source sans action → revue Achats liée à un brouillon serveur et à une réception simulée traçable | PostgreSQL jetable sans volume : `npx prisma migrate deploy` (7/7) ; `npm run test:integration` (15 fichiers/24 tests, dont 2 C1) ; `npm test` (15 Vitest/74 tests et 30 tests Node/CSS) ; `npm run lint`, `npm run build`, `npm run build:api`, `npx prisma validate`, `git diff --check`. Les tests C1 couvrent création concurrente, autre tenant, corrections/révisions append-only, hash/révision source, crédit simulé préalable exposé aussi dans l'historique des factures, réception concurrente et rejeu idempotents, avoir/BL, réception partielle, rollback, mouvement relié et API d'historique produit. | Un premier lancement d'intégration depuis la sandbox a échoué (loopback/socket) ; le run final a passé sur le conteneur jetable sans volume, puis le conteneur a été supprimé. L'application compile mais le contrôle visuel/clavier n'a pas pu être exécuté : la session CUA ne fournit aucun navigateur. Aucun document réel/Camille ni script `--write` n'a été utilisé. | Reprendre le contrôle navigateur C1 puis traiter les dépendances D2–D6 avant C2 selon le plan. |

## Portes externes

| Sujet | Ce qui est possible sans accès | Preuve requise pour « activé » | État |
| --- | --- | --- | --- |
| POS | Port, fixtures, mapping, repli manuel | Contrat/droits et tests fournisseur/pilote | À confirmer |
| OCR de nouveaux documents | Revue des transcriptions existantes, flux candidat | Prestataire, sécurité, conservation, consentement et évaluation | À confirmer |
| Météo/événements | Contrat et comparaison sur fixtures | Position confirmée, accès et gain évalué | À confirmer |
| Précision/gain réel | Calculs/backtests reproductibles | Historique pilote qualifié et mesure comparée | À confirmer |
| Envoi/EDI, conformité | Fiche à transmettre, export opérationnel | Destinataire/accord ou obligations vérifiées | À confirmer |
| Préproduction/publication | Environnement isolé, smoke tests jetables | API/DB/backup/cookies/accès vérifiés, approbation de publication | À confirmer |

## Critique indépendante et dette restante

Noter ici les retours des sous-agents/relecteurs : constat, gravité, preuve,
responsable, correction et nouveau test. Une remarque importante non résolue
empêche de marquer le parcours concerné comme terminé. Les tickets externes
restent distincts des défauts locaux corrigeables.

- **Q1b — isolation des données de test (corrigée localement)** :
  `sourceInvoices.test.ts` utilise maintenant un répertoire temporaire de textes
  synthétiques ; `restaurantSimulationPlan.test.ts` utilise un corpus généré
  sans pièces fournisseur. Le workflow sparse-checkout exclut
  `données restaurants/factures/**`. Revue : le premier test d'intégration ne
  rejouait que le calcul pur, et son libellé « restaure » surestimait une
  suppression en cascade ; corrigé par un helper idempotent de fixture (rejeu
  séquentiel et concurrent) et un libellé exact. Il ne prouve pas l'idempotence
  de production C1. L'exécution GitHub n'a pas été déclenchée ; le résultat
  local ne prouve pas le comportement du runner distant.
