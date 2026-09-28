# Terrasse et ajustement météo des estimations

## Décision et périmètre — 28 septembre 2026

À la demande explicite de l’utilisateur, l’ajustement météo est implémenté dès ce
lot, et non simplement préparé par un champ de profil. Il remplace la restriction
« contexte uniquement » de [W0–W2](service-weather.md) pour les estimations
opérationnelles. Ce sont des **hypothèses de scénario non calibrées**, pas un modèle
appris ni une preuve de gain prédictif. La comparaison historique F1 reste inchangée.

- Réglages → restaurant → Terrasse : non renseigné / oui / non. Le choix est
  enregistré côté serveur, par restaurant. `null` ne signifie pas « non ».
- Services : quantité historique, pourcentage, justification et estimation ajustée.
- Les besoins ingrédients et d’achat utilisent ces quantités ajustées, avant
  déduction du stock, des arrivages conditionnels et arrondi au conditionnement.
- Le chef conserve la validation des portions et achats. Aucun calcul ne crée
  de vente, production, perte, commande ou mouvement de stock.

## Politique `terrace-weather-v1`

Première règle correspondante uniquement, sans cumul :

| Conditions prévues sur la journée | Sans terrasse | Avec terrasse |
| --- | ---: | ---: |
| Orage ou vent maximal ≥ 40 km/h | −10 % | −30 % |
| Fortes précipitations, neige ou conditions givrantes | −8 % | −25 % |
| Pluie ou averses | −5 % | −15 % |
| Brouillard ou bruine | −3 % | −10 % |
| Ciel dégagé/éclaircies, maximum entre 15 et 28 °C inclus et vent < 25 km/h | +3 % | +10 % |
| Autres conditions connues | 0 % | 0 % |

Les codes exacts et seuils sont dans
[la politique pure partagée](../../shared/weatherScenario.ts).
Le [contrôle serveur](../../server/src/application/workspace/forecastWeatherPolicy.ts)
garde la vérification de provenance, de fraîcheur et de complétude. L’atelier
documentaire réutilise uniquement les coefficients pour ses hypothèses de scénario,
sans accéder aux données du restaurant ni se présenter comme météo réelle.
La quantité est multipliée par `1 + coefficient / 100`, arrondie à trois décimales.
La base et sa dispersion observée restent conservées ; aucune quantité inconnue
n’est remplacée par une estimation météo. La reprise en portions de préparation
réutilise l’arrondi existant, sous revue du chef.

La météo est celle de la journée entière à la commune, pas une observation ni une
prévision spécifique à l’heure du service. Le code journalier décrit l’épisode le
plus marqué, pas nécessairement toute la journée ; la même hypothèse s’applique
à midi et au soir. Une calibration future devra évaluer ce choix et les coefficients.

## Conditions et repli

Tous les prérequis sont nécessaires : terrasse renseignée, espace opérationnel,
fournisseur activé, commune confirmée, données réelles normalisées, cache récent
(`ready`, moins d’une heure), journée complète, condition/température/vent connus.
Sans eux, conserver la base historique avec une raison explicite. Une météo de
fixture, une donnée ancienne, un échec de connexion, une date hors des sept jours
ou une position invalidée ne doivent jamais ajuster les quantités.

Les lectures HTTP des prévisions et achats actualisent le cache existant au besoin.
Les validations utilisent seulement le cache serveur, sans appel externe dans la
transaction. La météo ne supprime aucun blocage d’historique ou de carte.

## Traçabilité et compatibilité

- `ForecastService.weatherAdjustment` : version, présence de terrasse, état,
  pourcentage, motif, commune/date/code, maximum de température/vent, date de
  récupération et référence du contexte. Les articles ajustés gardent `baselineQuantity`.
- Les clés de prévision et de suggestion incluent cette référence. Un changement
  de terrasse, météo ou fraîcheur exige une nouvelle revue avant validation.
- La première sauvegarde d’un brouillon référencé conserve le détail consulté ;
  la validation recontrôle toujours cette référence pour imposer une revue si elle a changé.
- Les décisions de préparation et d’achat conservent leur snapshot immuable ;
  le rejeu ne le recalcule pas. Le plan du chef n’est pas remplacé par le résultat.
- La fiche imprimable expose base, coefficient et provenance conservés. Les anciens
  snapshots sans ces champs restent lisibles, sans inventer de météo rétrospective.
- Le contexte météo consulté (`weatherContext`) reste distinct de la référence de
  calcul (`forecastReference`). Un plan manuel reste possible sans météo.

## Migration et retour arrière

Migration additive unique :
[`20260928000000_restaurant_terrace`](../../prisma/migrations/20260928000000_restaurant_terrace/migration.sql)
ajoute `Restaurant.hasTerrace BOOLEAN`, nullable, sans défaut ni réécriture métier.
Un ancien client omettant ce champ conserve la valeur existante au PATCH.

Retour arrière applicatif : revenir au code précédent et régénérer son client
Prisma, **en conservant la colonne additionnelle** ; ne pas supprimer ni réécrire
les données. Pour suspendre le calcul sans retour de code, remettre Terrasse sur
« Non renseigné » pour le restaurant (les décisions passées restent inchangées).

**Migration locale appliquée le 28 septembre 2026**, après autorisation explicite
de l’utilisateur de finaliser l’ensemble. Le refus initial du contrôle automatique
a été levé avec cet accord, la sauvegarde et les preuves de retour arrière.
Une sauvegarde PostgreSQL custom de la base locale a été créée dans `.backups.local/`
(dossier privé, archive `0600`, ignorée par Git) et sa lisibilité contrôlée par
`pg_restore --list` avant application. La restauration effective reste celle de la
recette synthétique jetable ; aucune restauration ni suppression de données locales
n’a été effectuée.

`prisma migrate status` confirme les 20 migrations appliquées. Les nombres de
restaurants, ventes, mouvements de stock, productions, commandes et décisions sont
identiques avant/après. Le choix Terrasse des restaurants existants reste inconnu :
aucune présence de terrasse n’a été déduite ni configurée à leur place.

## Vérification

- Tests purs : coefficients, limites de température/vent, priorité sans cumul,
  provenance et replis, quantités nulles/zéro, conservation de la base et dispersion.
- HTTP sur fixtures isolées : profil typé et isolation, historique qualifié →
  prévisions → matières → achat, références périmées refusées, snapshots et rejeux
  immuables, absence d’écriture opérationnelle lors du calcul.
- Migration exécutée sur table temporaire préexistante : ligne préservée, valeur
  initiale inconnue, lecture des anciennes colonnes toujours possible.
- SSR et export imprimable : base, coefficient, limite non calibrée, source et
  échappement du contenu. La recette visuelle/clavier/mobile reste en attente selon
  la restriction du [plan principal](service-flow-continuity.md#6-matrice-de-validation).
- Recette finale `npm run verify:local-delivery` réussie le 28 septembre 2026 :
  lint/CSS, builds web/API, **308 tests Vitest**, **35 tests de scripts** et
  **61 tests d’intégration dans 36 fichiers**. Les 20 migrations, la parité Prisma,
  la conservation d’une ligne préexistante et la restauration synthétique passent.
  Le conteneur jetable a été supprimé ; aucune donnée de la base conservée modifiée.
- Contrôle local après migration : `/api/health` et `/api/ready` renvoient 200 ;
  lecture authentifiée du seul compte `kookia` : profil avec `hasTerrace` typé et
  prévisions avec `weatherAdjustment`, tous deux 200. Session de contrôle fermée,
  aucun changement de profil ou enregistrement métier effectué.
- `git diff --check` et liens locaux de la documentation vérifiés. Aucun commit
  ni déploiement externe effectué pour ce lot. Le réglage est disponible localement.
