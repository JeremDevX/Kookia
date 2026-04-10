# AGENTS.domain.md

## Rôle
Cet agent gouverne le langage métier, les règles métier, les policies, les invariants, les frontières d’entités et la modélisation du domaine KOOKIA.

À activer dès qu’une tâche touche :
- logique de prévision
- recommandations
- concepts métier restauration
- règles de validation
- décisions métier
- anti-gaspillage
- traçabilité
- métriques ou terminologie métier

---

## Qualification obligatoire avant action
Avant de modifier du domaine, déterminer si la tâche est :
- modélisation métier
- création de règle
- correction de règle
- extraction de policy
- définition de validation / invariant
- mapping externe vers domaine
- logique de reporting
- amélioration d’explicabilité / traçabilité

Puis identifier :
- le concept métier impacté
- la source de vérité
- l’invariant qui doit rester vrai
- si la règle appartient réellement au domaine ou n’est qu’un formatage UI

---

## Principes domaine KOOKIA
- Le produit **aide à décider**, il ne remplace pas silencieusement le jugement humain.
- Les recommandations doivent rester **révisables** et **compréhensibles**.
- Les sorties critiques doivent être suffisamment explicables pour générer de la confiance.
- Le langage métier doit rester proche des opérations réelles d’un restaurant.
- Garder les données externes brutes séparées des concepts métier normalisés.
- Utiliser des noms métier, pas des placeholders techniques, dans le domaine.

---

## Concepts métier suggérés
À utiliser quand c’est pertinent :
- Restaurant
- ServiceDay
- SalesSnapshot
- TicketImport
- PosConnection
- Forecast
- ForecastInput
- ForecastConfidence
- PurchaseRecommendation
- PurchaseRecommendationLine
- StockAlert
- WasteMetric
- AgecReport
- AuditFinding
- OnboardingCalibration

Ce sont des exemples, pas des obligations.  
Créer seulement ce que le code et les cas d’usage justifient réellement.

---

## Frontières du domaine
### Ce qui appartient au domaine
- invariants
- policies de décision
- règles d’éligibilité d’une recommandation
- normalisation
- métadonnées d’explicabilité
- seuils métier
- interprétation de la confiance
- cycle de vie des états
- transitions de statut
- erreurs métier

### Ce qui n’appartient pas au domaine
- choix de rendu JSX
- nommage CSS
- wording de toast
- détails de router
- plomberie événementielle liée au framework
- préoccupations de transport brut

---

## Règles de modélisation
- Préférer des fonctions pures pour les règles déterministes.
- Préférer des value objects ou des types explicites pour les valeurs métier significatives.
- Éviter la primitive obsession dès qu’un concept porte du sens métier.
- Faire disparaître les états invalides dès la modélisation quand c’est possible.
- Utiliser des unions discriminées pour les state machines ou résultats exclusifs.
- Rendre explicites la création et la normalisation des entités.
- Éviter les magic numbers ; déplacer les seuils métier dans des constantes nommées ou des objets de config possédés par le domaine.

---

## Règles d’explicabilité et de confiance
Toute recommandation à impact devrait idéalement exposer :
- les inputs qui l’influencent,
- le niveau de confiance,
- si une validation utilisateur est requise,
- si une logique de fallback a été utilisée.

Si l’explicabilité complète n’existe pas encore, ne pas la simuler.  
Représenter explicitement l’incertitude.

---

## Invariants à protéger
Ces attentes valent par défaut tant qu’un vrai choix produit ne les modifie pas :
- une recommandation est une **suggestion**, pas une commande implicite
- une validation humaine doit rester possible avant toute action externalisée
- une donnée de qualité inconnue ne doit jamais être affichée comme certaine
- une donnée OCR ou importée peut nécessiter une normalisation avant usage métier
- une donnée incomplète doit dégrader proprement le service, pas faire semblant d’être complète
- aucune allégation réglementaire ou de conformité ne doit être affirmée sans support réel

---

## Patterns recommandés
- services de décision purs
- validateurs renvoyant des erreurs structurées
- mappers DTO brut -> shape métier sûre
- objets résultat métier plutôt que booléens pauvres
- modules de policy explicites
- terminologie métier claire

---

## Anti-patterns
- règles métier copiées dans plusieurs composants
- calculs mélangés à des labels ou de la logique de style
- fichier utilitaire unique “pour tout”
- payloads API/OCR bruts utilisés partout
- fallbacks cachés sans traçabilité
- sur-modélisation avant besoin réel

---

## In scope
- types métier
- règles et policies
- normalisation
- modèles de confiance
- décisions de recommandation
- métriques et transitions d’état métier

## Hors scope
- détails de présentation
- plomberie applicative globale
- décisions d’infrastructure
- design de persistance sauf nécessité directe de la tâche

---

## Checklist de fin
- les noms reflètent la réalité métier restauration
- les invariants sont explicites
- les données incertaines sont représentées honnêtement
- la logique métier est testable sans React
- aucune préoccupation UI ne fuit dans le domaine
- la logique de recommandation conserve le contrôle humain
