# AGENTS.backend.md

## Rôle
Cet agent gouverne la couche backend applicative de KOOKIA : handlers, contrôleurs, cas d’usage, orchestration, persistance, jobs asynchrones, intégrations externes et frontières entre transport, application et domaine.

À activer dès qu’une tâche touche :
- endpoints backend
- contrôleurs / handlers
- services applicatifs
- orchestration métier
- accès données
- transactions
- files / jobs / traitements différés
- intégrations POS, OCR ou services tiers

---

## Qualification obligatoire avant action
Avant de modifier le backend, classer la tâche :
- correction de bug applicatif
- implémentation de feature backend
- correction de validation serveur
- orchestration de use case
- intégration externe
- refacto de couche applicative
- correction persistance
- traitement asynchrone / job
- amélioration de robustesse / idempotence

Puis déterminer :
- si le changement relève du **transport**, de **l’application**, du **domaine** ou de **l’infrastructure**
- où se situe la source de vérité
- si la logique doit vivre dans un handler, un use case, un repository, un adapter ou un job
- si le traitement doit être **synchrone**, **asynchrone**, **transactionnel** ou **idempotent**

---

## Principes backend
- Garder des entrées serveur **prévisibles, robustes et explicites**.
- Faire des handlers fins : parser, autoriser, déléguer, répondre.
- Garder les règles métier dans le domaine ou des services de décision, pas dans les contrôleurs.
- Utiliser la couche applicative pour orchestrer les dépendances, pas pour absorber tout le métier.
- Rendre visibles les effets de bord : écriture, appel externe, file, retry, transaction.
- Préférer un flux simple et lisible à une abstraction backend “intelligente” mais opaque.

---

## Frontières de couches
### Transport
- Reçoit la requête, valide le format, extrait le contexte, appelle le cas d’usage.
- Ne décide pas de règles métier profondes.
- Ne connaît pas les détails de persistance.

### Application
- Orchestre les dépendances.
- Coordonne domaine, repositories, adapters et side effects.
- Gère les unités de travail, l’ordre des opérations et les échecs applicatifs.

### Domaine
- Porte les règles et invariants métier.
- Ne dépend pas du protocole HTTP, du framework ou de la base.

### Infrastructure
- Implémente repositories, clients externes, stockage, OCR, files et adaptateurs techniques.
- Ne doit pas contaminer le domaine avec des shapes brutes ou des détails de vendor.

---

## Règles d’implémentation backend
### Handlers / contrôleurs
- Garder les handlers courts et orientés protocole.
- Convertir les entrées transport en données applicatives explicites.
- Retourner des erreurs structurées et stables.
- Ne pas faire de mapping base de données directement dans le contrôleur.
- Ne pas déclencher plusieurs effets de bord dispersés sans orchestration claire.

### Cas d’usage / services applicatifs
- Un cas d’usage doit porter une intention métier claire.
- Nommer les cas d’usage par action métier, pas par détail technique.
- Rendre explicites les préconditions, postconditions et échecs attendus.
- Isoler les appels externes derrière des interfaces ou adapters possédés.
- Garder la séquence des effets de bord lisible et testable.

### Persistance
- Faire transiter le domaine via des repositories ou adapters, pas via des accès directs partout.
- Séparer les modèles de persistance des modèles métier si les contraintes divergent.
- Préférer des opérations explicites à des helpers génériques opaques.
- Les écritures multiples liées doivent avoir une frontière transactionnelle claire.
- Ne pas laisser des décisions métier être dictées par un shape de table ou un SDK.

### Jobs et asynchronisme
- Utiliser un job quand la latence, le retry ou l’isolement le justifient réellement.
- Les jobs doivent être idempotents ou rendre leur non-idempotence explicite.
- Nommer clairement ce qui est déclenché plus tard.
- Ne pas cacher un traitement critique derrière une file sans traçabilité.
- Prévoir le comportement en cas de retry, duplication, timeout ou appel externe partiellement réussi.

---

## Validation, erreurs et robustesse
- Valider côté serveur même si le front valide déjà.
- Distinguer les erreurs de validation, de domaine, d’autorisation, d’intégration et d’infrastructure.
- Ne pas exposer d’erreurs internes brutes au client.
- Préférer des erreurs structurées avec code, message stable et contexte utile.
- Faire remonter une incertitude honnête plutôt qu’un faux succès.
- Une intégration externe instable doit dégrader proprement le service.

---

## Intégrations externes
- Encapsuler les vendors derrière des adapters nommés.
- Mapper les payloads externes vers des formes internes stables dès la frontière.
- Ne pas propager des conventions tierces dans tout le codebase.
- Prévoir la variation des données externes : champs manquants, statuts inattendus, latence, doublons.
- Les appels externes à impact financier ou réglementaire doivent être traçables.

---

## Transactions et cohérence
- Définir explicitement ce qui doit réussir ensemble et ce qui peut être compensé.
- Préférer une transaction courte et claire quand la cohérence forte est nécessaire.
- Si une transaction distribuée n’existe pas, documenter la stratégie de compensation ou de retry.
- Éviter les side effects externes irréversibles au milieu d’une écriture locale non sécurisée.
- En cas de doute, choisir la stratégie qui évite les écritures silencieusement incohérentes.

---

## In scope
- handlers et contrôleurs
- cas d’usage applicatifs
- orchestration backend
- repositories et adapters
- validation serveur
- jobs et traitements différés
- gestion d’erreurs backend
- transactions et robustesse

## Hors scope
- règles métier profondes qui appartiennent au domaine
- design d’API contractuel détaillé au-delà de ce que `AGENTS.api.md` gouverne
- décisions purement UI
- infrastructure d’exploitation et déploiement
- conformité réglementaire au-delà de ce que `AGENTS.compliance.md` gouverne

---

## Patterns recommandés
- handler fin + use case explicite
- repository orienté intention métier
- adapters pour vendors externes
- résultats applicatifs structurés
- transactions explicites
- jobs idempotents
- mapping aux frontières

---

## Anti-patterns
- contrôleur qui valide, calcule, écrit, appelle des APIs tierces et formate tout seul
- logique métier copiée dans les handlers
- accès base directement depuis plusieurs couches sans ownership clair
- appel vendor propagé partout dans l’application
- job “magique” sans contrat d’entrée ni stratégie d’échec
- transaction implicite ou incertaine
- succès renvoyé alors qu’un side effect critique a échoué

---

## Checklist de fin
- les responsabilités transport / application / domaine / infra sont lisibles
- les handlers restent fins
- les effets de bord sont visibles
- la validation serveur couvre les entrées utiles
- les erreurs sont structurées et honnêtes
- les opérations critiques ont une stratégie de cohérence claire
- les intégrations externes sont confinées à des frontières explicites
