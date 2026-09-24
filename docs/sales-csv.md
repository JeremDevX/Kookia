# Import CSV des ventes Kookia

Ce format décrit les **articles vendus** du restaurant (plats ou produits à la
carte), distincts des ingrédients du stock. Créer ces articles dans **Ventes**
avant l'import, ou les associer dans l'aperçu. Aucune ligne de démonstration
n'est ajoutée au catalogue des articles vendus.

Fichier UTF-8, séparateur virgule, première ligne exactement :

```csv
service_date,item_name,quantity
2026-09-20,Pizza Margherita,12
2026-09-20,"Soda, 33 cl",8
```

- `service_date` : date de service `AAAA-MM-JJ`, non future (heure de Paris).
- `item_name` : nom de l'article vendu, maximum 120 caractères ; les virgules
  nécessitent des guillemets CSV. Les guillemets internes se doublent.
- `quantity` : nombre entier d'unités vendues, de 1 à 1 000 000.
- Maximum 5 000 lignes de ventes et 256 Ko. Un saut de ligne final est accepté.

L'aperçu valide chaque ligne et propose une correspondance par nom exact
(insensible à la casse) avec le catalogue du restaurant. Les noms inconnus
nécessitent une correspondance explicite. Un import confirmé crée un lot et un
snapshot borné de chaque ligne : libellé/date/quantité source, numéro de ligne,
mapping retenu, statut et motif. Le CSV brut n'est jamais conservé. Les lignes
invalides, sans correspondance ou dupliquées dans le lot restent rejetées et
consultables ; seules les lignes valides sans conflit sont projetées en vente.

Une vente déjà présente pour le même article et la même date devient un conflit
à réconcilier. Dans **Ventes**, le responsable peut remplacer explicitement la
vente acceptée ou la garder et rejeter le candidat. Un remplacement est
atomique, versionné et ne somme jamais les quantités. La saisie manuelle
concurrente suit le même parcours de revue. Corrections, remplacements,
annulations et remboursements signalés conservent des événements d'audit avec
acteur, révision et motif. Une annulation retire une ligne erronée de la
projection ; signaler un remboursement monétaire ne change pas les unités
vendues (le modèle n'enregistre ni prix de vente ni chiffre d'affaires).

L'empreinte d'import lie le hash du CSV à celui des correspondances : rejouer
le même contenu et le même mapping dans un restaurant est idempotent ; changer
le mapping requiert un nouvel aperçu et une nouvelle confirmation. Le même
contenu dans un autre restaurant reste isolé. Les sources POS et Ticket Z ne
sont pas connectées ; leur éventuelle activation devra rejoindre cette
réconciliation, pas additionner une nouvelle projection. L'import ne modifie
ni stock, ni commande, ni prévision de démonstration.
