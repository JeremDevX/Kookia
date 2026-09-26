# Adaptation opérationnelle de Kookia

## Mandat

Implémenter les neuf axes du tableau demandé le 27 septembre 2026. Le générateur
reste une fixture indépendante : aucune valeur aléatoire, perte présumée ou
échéance inventée ne devient une opération Kookia. Le chef garde la validation.
Commits fréquents par incrément cohérent. Aucun test dans le navigateur, sur
instruction explicite ; validation par politiques, API sur base jetable et
rendu statique des composants lorsque pertinent.

## Découpage et preuves de sortie

| Axe | Résultat attendu | Preuves requises | État |
| --- | --- | --- | --- |
| Services | Horaires hebdomadaires, exceptions, midi/soir, couverture observée distincte | Planning sans faux zéro ; ventilation invalidée par correction ; refus des ventes/couverts sur session fermée ; isolation HTTP | Implémenté et vérifié |
| Lots | Réceptions datées, échéance déclarée, coût et quantités, sorties FEFO traçables | Réception/rejeu ; expirations bloquant la production ; stock historique sans âge ; faisabilité catalogue cohérente | Implémenté et vérifié |
| Fiche de service | Prévu, préparation validée, compléments, vendu, invendu, conservé/écarté, substitutions | Prévision serveur conservée et clé périmée refusée ; clôture réconciliée immuable ; portions fractionnelles ; absence de double sortie | Implémenté et vérifié |
| Rendements/pertes | Brut/net versionné, causes et évitabilité, lien lot/production/service | Brut atomique ; parures/invendus/retours sans seconde déduction ; Bilan/export datés par service et coûts de lots prouvés | Implémenté et vérifié |
| Achats | Calendrier fournisseur, délais/cutoff, conditionnements et horizon, attendu distinct du stock | FEFO par service ; livraison future ne couvre pas un manque antérieur ; paramètre inconnu bloquant ; revue chef | Implémenté et vérifié |
| Prévisions | Jour/service/carte, historique qualifié, mix et dispersion, saisonnalité conditionnelle | Dates sans fuite ; ventes incomplètes/simulées exclues ; historique insuffisant explicite ; aucun score terrain inventé | Implémenté et vérifié |
| Carte | Versions datées par service, choix, disponibilités, prix, boissons/formules | Prix/dosages historiques ; formules décomposées une fois ; indisponibles exclus ; conflits/rejeux/isolation | Implémenté et vérifié |
| Incidents | Signalements réels reliés, conséquences prochain service, ajustements proposés | Liens tenant-scopés ; rejeu et résolution révisée ; aucun changement implicite de stock/vente/commande/production | Implémenté et vérifié |
| Pièces | Chaîne commande/réception/facture/avoir, ventes/remboursements, fiches imprimables | Avoir sans sortie stock ; remboursements journaliers sans montant/service inventé ; HTML échappé et constat figé testé | Implémenté et vérifié hors navigateur |

## Frontières et compatibilité

- API authentifiée et isolation restaurant existantes conservées. Validation des
  contrats aux frontières, règles pures lorsque possible, attribution et révisions.
- Les ventes restent canoniques par article/jour ; leur ventilation midi/soir est
  explicite et invalidée par une correction de la source. Le reliquat reste non
  ventilé, jamais artificiellement affecté à midi.
- Les anciennes quantités de recette restent brutes. Le net est facultatif. Les
  anciens stocks sans preuve de réception/échéance restent sans âge connu.
- Migrations additives et vérifiées sur PostgreSQL jetable uniquement. Ne pas
  appliquer de migration à la base conservée. Sauvegarde/restauration de la base
  synthétique et parité Prisma/migrations avant livraison.
- Les évaluations sur fixtures prouvent les contrats, pas une précision terrain.
  Aucun POS, OCR, météo, envoi fournisseur ni certification réglementaire ajouté.

## Répartition

- Sous-agent Sol services : calendrier, sessions et ventilation des ventes.
- Sous-agent Sol lots/pertes : réceptions, mouvements, productions et rendements.
- Sous-agent Sol achats : contraintes fournisseur, horizon, commandes attendues et avoirs.
- Principal : schéma/migrations communs, carte, fiche de service, prévisions,
  incidents, intégration, contrôles et commits.

## Validation et suivi

État initial propre au commit `26b1cba`. Les incréments sont commités séparément :
plan, schéma, calendrier, lots/pertes, prévisions/achats, disponibilité des recettes,
Bilan/export, services/carte, incidents et documentation finale.

### Couverture métier

- `serviceCalendar.integration.test.ts` et `serviceCalendar.test.ts` : calendrier,
  exceptions, couverture, ventilation et révision des sources.
- `lotWaste.integration.test.ts`, `lotService.test.ts` et
  `catalogAvailability.integration.test.ts` : réception, correction, comptage,
  production FEFO, expirations, idempotence, pertes et isolation.
- `serviceSheetPolicy.test.ts`, `serviceSheet.integration.test.ts` et
  `serviceSheetPrint.test.ts` : plan relu, provenance des prévisions, substitutions,
  réconciliation, fractions, remboursements, clôture et échappement HTML.
- `serviceMenuForecast.integration.test.ts` et `operationalForecastPolicy.test.ts` :
  versions, prix, formules, saisonnalité conditionnelle, historique incomplet,
  dates et besoins matière qualifiés.
- `purchaseSuggestions.integration.test.ts`, `purchaseAvailability.test.ts`,
  `supplierDelivery.test.ts`, `purchaseReconciliation.integration.test.ts` :
  horizon, dates d'arrivée, échéances, conditionnements, avoirs et isolation.
- `operationalIncidents.integration.test.ts` : signalements liés, conséquences,
  résolution revue, répétitions et absence de mutation opérationnelle implicite.
- `declaredWasteRead.test.ts`, `impact.integration.test.ts`, tests de rapport et
  rendu statique du Bilan : date de service, unités historiques, coût connu,
  absence de double comptage et déclarations partielles distinctes des KPI complets.

### Vérifications transversales

- `npm run lint` : réussi, dont 41 fichiers CSS contrôlés.
- `npm run build` et `npm run build:api` : réussis.
- `npm test` : 35 tests des scripts et 258 tests Vitest, 60 fichiers, réussis.
- Intégrations PostgreSQL : 54 tests dans 33 fichiers réussis sur base dédiée loopback/tmpfs ;
  aucun compte opérationnel ni base conservée utilisés.
- `npm run documents:build` après le build principal : réussi, sans génération
  dans le navigateur. Avertissements non bloquants Rollup/Zod et dossier de sortie.
- Migration additive appliquée aux seules fixtures ; parité Prisma/migrations
  confirmée. Sauvegarde/restauration de 41 tables dans une copie jetable :
  mêmes nombres de lignes, mêmes empreintes de contenu et même schéma.
  La copie et le conteneur temporaire ont ensuite été supprimés.
- Guides de l'atelier et d'import alignés sur les nouveaux contrats ; les six
  tests documentaires ciblés et leur build ont été relancés après ces textes.
- `git diff --check` : réussi.

### Limites explicites

Les tests navigateur sont exclus par instruction : aucun parcours clavier,
responsive ou rendu visuel final n'est prétendu vérifié. Les prévisions n'ont pas
de calibration terrain. Les quantités conservées sont un constat de clôture,
pas un inventaire cuisiné transférable ni une validation sanitaire de réemploi.
Les remboursements existants ne portent pas de montant ni de service. Les avoirs
ne recalculent pas silencieusement les anciens KPI d'achat. Aucun connecteur POS,
OCR, météo, envoi fournisseur ou conformité réglementaire n'est ajouté.

La base opérationnelle n'a pas reçu la migration. Le parcours et les règles sont
décrits dans [Services, carte et stocks opérationnels](../operational-services.md).
