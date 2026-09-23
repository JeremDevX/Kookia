# Journal de reprise du Goal Kookia

**État initial :** prompt et référentiel préparés ; le Goal de développement
n'a **pas** été lancé dans ce travail documentaire. Ce fichier n'est pas une
preuve que les fonctionnalités cibles sont livrées. Au démarrage, relever date,
branche, `git status`, migrations et tests disponibles sans effacer les
modifications déjà présentes.

## Prochaine action démontrable

Vérifier l'état du code et de la base de test, puis traiter Q1/Q1b du
[plan d'exécution](plan-execution.md) si le garde-fou n'existe toujours pas.
Ensuite, prioriser C1 : relier les fiches fournisseurs **déjà importées** à la
revue et à la réception, avant tout nouveau connecteur OCR.

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
| Q1b — bac de scénario jetable | En cours | Non applicable | Générateur/parser purs réutilisables ; l'intégration existante sait nettoyer un tenant jetable. | Les tests lisent encore les 431 transcriptions du dépôt ; remplacer ces entrées par des fixtures synthétiques et les exclure du checkout CI avant la suite. |
| C1 — pièce fournisseur actionnable | À auditer | Non applicable | — | Archive existante ≠ nouvelle réception. |
| C2 — chronologie continue | À auditer | Non applicable | — | Simulation existante, scénario UX à prouver. |
| C3 — chaîne métier complète | À auditer | Non applicable | — | Aucune preuve de bout en bout encore consignée ici. |
| UI/KPI/mobile/clavier | À auditer | Non applicable | — | Rendu initial, critique, itération. |
| R0/R1 — local/préproduction | À auditer | Non activé | — | Backend hébergé non défini dans l'état documentaire. |

## Journal de preuves (ajouter une ligne par incrément vérifié)

| Date | ID | Commit local | État avant → après | Commande/test ou scénario UI exécuté | Résultat et limite | Prochaine action |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-24 | Q1 | `361add3` (garde), `dd710de` (journal) | Runner direct sans garde → URL locale `kookia_test` obligatoire ; CI configurée sur PostgreSQL éphémère | `node --test scripts/integrationDatabaseGuard.test.mjs` (2/2) ; `npm run test:integration` avec `.env` développement (refus avant démarrage) ; PostgreSQL jetable sans volume : migrations 6/6 et intégration 13 fichiers/21 tests ; `npm run lint`, `npm run build`, `npm run build:api`, `npm test` | Réussite locale. Intégration n'a utilisé que le port aléatoire du conteneur temporaire, supprimé après usage. Action GitHub non exécutée ; cela ne prouve pas un run distant. | Q1b : amorcer et restaurer un tenant/DB de scénario jetable, sans toucher Camille. |

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

- **Q1b — isolation des données de test (bloquant avant le statut prouvé)** :
  `sourceInvoices.test.ts` et `restaurantSimulationPlan.test.ts` appellent
  `readSourceInvoices()` sans racine, ce qui lit les 431 transcriptions suivies
  dans `données restaurants/factures/` pendant `npm test`. Le workflow CI faisait
  un checkout complet. Remplacer ce chemin par des fixtures synthétiques et
  exclure le répertoire documentaire du checkout CI ; garder le parser réel et
  le générateur éprouvés sans intégrer ces transcriptions aux artefacts partagés.
