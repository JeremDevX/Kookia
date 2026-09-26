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
| Services | Horaires hebdomadaires, exceptions, midi/soir, couverture observée distincte | Planning sans faux zéro ; ventilation conservatrice des ventes ; attribution production/pertes ; UI et API isolées | En cours |
| Lots | Réceptions datées, échéance déclarée, coût et quantités, sorties FEFO traçables | Conservation tous chemins de stock, réception/rejeu, lot inconnu/périmé, isolation | En cours |
| Fiche de service | Prévu, préparation validée, compléments, vendu, invendu, conservé/écarté, substitutions | Rapprochement sans double écriture ni assimilation du reliquat à une perte | À intégrer |
| Rendements/pertes | Brut/net versionné, causes et évitabilité, lien lot/production/service | Déchet cuisiné sans seconde déduction ; pertes brutes atomiques ; historique intact | En cours |
| Achats | Calendrier fournisseur, délais/cutoff, conditionnements et horizon, attendu distinct du stock | Dates/cutoff, reliquat non reçu, validation chef, incohérence/absence explicite | En cours |
| Prévisions | Jour/service/carte, historique qualifié, mix et dispersion, saisonnalité conditionnelle | Dates sans fuite, ventes incomplètes/simulées exclues, faible historique exposé, aucun score terrain inventé | À intégrer |
| Carte | Versions datées par service, choix, disponibilités, prix, boissons/formules | Historique conservé, ingrédients des composants une seule fois, édition revue | À intégrer |
| Incidents | Signalements réels reliés, conséquences prochain service, ajustements proposés | Aucun changement implicite de commande/production ; décision attribuée | À intégrer |
| Pièces | Chaîne commande/réception/facture/avoir, ventes/remboursements, fiches imprimables | Références reliées, effets stock explicites, rendu statique lisible | À intégrer |

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

État initial propre au commit `26b1cba`. À compléter après chaque incrément :
preuves ciblées, puis `lint`, `build`, `build:api`, `test`, tests d'intégration
jetables, parité des migrations, sauvegarde/restauration et `git diff --check`.
La restriction de tests navigateur reste une limite de recette UI explicite.
