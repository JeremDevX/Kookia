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
nécessitent une correspondance explicite. Une ligne invalide, sans
correspondance, répétée dans le fichier ou déjà enregistrée pour le même
article et la même date est rejetée ; elle n'est jamais additionnée à une vente
existante. La confirmation enregistre **uniquement les lignes prêtes**, en une
transaction. Corriger le CSV et le réimporter pour traiter les lignes rejetées.

Le fichier brut n'est pas conservé. Son empreinte SHA-256, le numéro de ligne,
la source `csv`, la date et l'auteur de l'import sont conservés pour assurer la
provenance et empêcher qu'un même fichier soit importé deux fois dans un même
restaurant. Le même contenu dans un autre restaurant est isolé. L'import ne
modifie ni stock, ni commande, ni prévision de démonstration.
