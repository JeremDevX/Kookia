# AGENTS.api.md

## Rôle
Cet agent gouverne les contrats d’API de KOOKIA : design des endpoints, schémas d’entrée et de sortie, sémantique HTTP, versioning, pagination, filtres, idempotence et stabilité contractuelle.

À activer dès qu’une tâche touche :
- design d’endpoint
- contrats request / response
- schémas DTO
- erreurs API
- conventions HTTP
- pagination / tri / filtres
- versioning
- compatibilité de contrat

---

## Qualification obligatoire avant action
Avant de modifier une API, classer la tâche :
- création d’endpoint
- évolution d’endpoint existant
- correction de contrat
- harmonisation de réponse
- correction de sémantique HTTP
- gestion de pagination / filtres
- gestion d’idempotence
- breaking change potentiel
- documentation de contrat

Puis déterminer :
- qui consomme le contrat
- si le changement est **additif**, **compatible** ou **cassant**
- si le shape appartient au **transport** ou au **domaine**
- si l’API doit exposer une donnée brute, normalisée, agrégée ou dérivée

---

## Principes de design API
- Concevoir des contrats **stables, explicites et minimaux**.
- Préférer des endpoints qui exposent une intention métier claire.
- Garder la forme transport distincte du domaine interne.
- Ne pas refléter passivement la structure de base de données dans l’API.
- Éviter la sur-flexibilité qui rend le contrat ambigu.
- Préférer une extension additive à une mutation silencieuse de comportement.

---

## Règles de sémantique HTTP
- Utiliser la méthode HTTP qui correspond réellement à l’intention.
- `GET` lit, `POST` crée ou déclenche, `PUT` remplace, `PATCH` modifie partiellement, `DELETE` supprime.
- Ne pas cacher une mutation dans un `GET`.
- Les codes de statut doivent refléter l’issue réelle de l’opération.
- Utiliser des réponses cohérentes pour validation, autorisation, conflit, absence et erreur interne.

---

## Contrats request / response
### Entrées
- Valider strictement les entrées transport.
- Préférer des champs explicites à des objets fourre-tout.
- Les champs optionnels doivent avoir une sémantique claire.
- Ne pas utiliser `null`, `undefined` et absence de champ comme trois états implicites sans contrat.

### Sorties
- Retourner uniquement ce qui est utile au consommateur.
- Garder les noms stables et cohérents entre endpoints semblables.
- Préférer des structures lisibles à des réponses trop compactes.
- Distinguer les états réellement différents plutôt que forcer une seule forme ambiguë.

### Erreurs
- Définir une forme d’erreur stable.
- Séparer code technique stable et message lisible.
- Ne pas exposer de stack, de SQL ou de détails internes.
- Une erreur de validation doit dire quel champ ou quelle règle a échoué.

---

## Versioning et évolution
- Préférer une évolution compatible par ajout de champ ou d’endpoint.
- Ne pas renommer, supprimer ou changer silencieusement le sens d’un champ consommé.
- Marquer explicitement les comportements dépréciés.
- Un breaking change doit être traité comme tel, pas maquillé en détail d’implémentation.
- Si plusieurs consommateurs existent, choisir la stratégie qui minimise la casse cachée.

---

## Pagination, filtres et tri
- Ajouter pagination, tri et filtres seulement quand le besoin réel existe.
- Garder des conventions identiques entre endpoints comparables.
- Les filtres doivent être nommés selon le métier ou la lecture attendue côté client.
- Retourner les métadonnées nécessaires à la navigation si la pagination existe.
- Ne pas exposer un DSL de requête trop puissant si un set simple couvre le besoin.

---

## Idempotence et concurrence
- Toute opération de création ou de déclenchement sensible doit être pensée pour duplication réseau et retry.
- Rendre explicite si une opération est idempotente, dédupliquée ou potentiellement répétable.
- Utiliser des clés ou garde-fous quand le doublon a un coût métier.
- En cas de conflit, renvoyer un état exploitable plutôt qu’une ambiguïté silencieuse.

---

## Frontières avec le domaine
- L’API expose un contrat de transport, pas le domaine brut.
- Mapper les value objects et états internes vers des DTO stables.
- Ne pas propager des enums internes fragiles sans vérifier leur pertinence publique.
- Les messages réglementaires ou de confiance doivent rester honnêtes et supportés.

---

## Documentation de contrat
- Documenter les endpoints publics ou significatifs.
- Décrire entrées, sorties, erreurs, hypothèses et limites.
- Garder la documentation alignée avec le comportement réel.
- Si la vérité du contrat est dans le code, ne pas maintenir une doc contradictoire à côté.

---

## In scope
- design d’endpoint
- schémas d’entrée et de sortie
- conventions HTTP
- erreurs API
- pagination / tri / filtres
- idempotence et compatibilité de contrat
- documentation contractuelle

## Hors scope
- règles métier profondes
- orchestration backend interne au-delà du contrat
- UI et wording d’interface
- choix de persistance
- conformité réglementaire profonde au-delà de ce qui impacte le contrat public

---

## Patterns recommandés
- DTO explicites
- erreur structurée stable
- évolution additive
- mapping domaine -> transport
- conventions uniformes entre endpoints proches
- idempotence pensée dès le design

---

## Anti-patterns
- endpoint miroir de table SQL
- réponse fourre-tout consommée différemment partout
- mutation cachée dans un `GET`
- breaking change silencieux
- erreurs incohérentes selon les routes
- usage flou de `null` et champs optionnels
- fuite de détails vendor ou persistence dans le contrat public

---

## Checklist de fin
- la sémantique HTTP est correcte
- le contrat est plus clair que le modèle interne, pas plus flou
- les champs sont stables et nommés explicitement
- les erreurs sont structurées
- les évolutions cassantes sont identifiées honnêtement
- la pagination / le tri / les filtres sont cohérents si présents
- la doc de contrat reflète le comportement réel
