# AGENTS.data.md

## Rôle
Cet agent gouverne la donnée, l’IA appliquée et les pipelines de KOOKIA : ingestion, OCR, normalisation, qualité de donnée, features de prédiction, scoring de confiance, reporting et traçabilité des transformations.

À activer dès qu’une tâche touche :
- import ou ingestion de données
- OCR
- normalisation
- pipeline de préparation
- features de prévision
- scoring / confiance
- reporting analytique
- qualité de donnée
- automatisation data

---

## Qualification obligatoire avant action
Avant de modifier la couche data, classer la tâche :
- ingestion de source externe
- parsing / OCR
- normalisation
- correction de qualité de donnée
- implémentation de logique de prévision
- calcul de métrique
- enrichissement de signal
- reporting / agrégation
- traçabilité / explicabilité data

Puis déterminer :
- la **source** de la donnée
- son **niveau de fiabilité**
- le point où elle devient **utilisable métier**
- si le changement touche **collecte**, **transformation**, **interprétation** ou **exposition**

---

## Principes data KOOKIA
- Une donnée brute n’est pas une donnée métier.
- Toute chaîne data doit rendre explicites ses hypothèses.
- Une donnée incertaine doit rester marquée comme telle.
- Une sortie prédictive sans niveau de confiance n’est pas assez fiable pour piloter une recommandation sensible.
- L’IA aide à décider ; elle ne doit pas masquer ses limites.
- La traçabilité des transformations compte autant que le résultat final.

---

## Chaîne de valeur data
### Collecte
- Identifier clairement d’où vient la donnée : POS, OCR, saisie manuelle, météo, calendrier, événement externe.
- Ne pas mélanger origine technique et signification métier.
- Capturer les métadonnées utiles : timestamp, source, version, mode d’acquisition.

### Parsing et OCR
- Considérer toute sortie OCR comme potentiellement imparfaite.
- Distinguer extraction brute, nettoyage, interprétation et validation métier.
- Prévoir des champs absents, mal lus, dupliqués ou ambigus.
- Une valeur non fiable ne doit pas être “devinée” sans trace.

### Normalisation
- Normaliser tôt les formats, unités, dates, montants et identifiants.
- Conserver la trace de la valeur brute si elle peut être utile à l’audit.
- Ne pas perdre l’information d’incertitude pendant la normalisation.

### Interprétation
- Les agrégations, features et métriques doivent être nommées selon leur sens métier.
- Rendre visible si un résultat dépend d’un fallback, d’une estimation ou d’un manque de signal.
- Une prédiction ne doit pas être présentée comme vérité observée.

---

## Qualité de donnée
- Modéliser explicitement la complétude, la fraîcheur, la cohérence et la fiabilité.
- Préférer un état “incomplet” ou “incertain” à une donnée silencieusement dégradée.
- Détecter et signaler les doublons, trous, formats invalides et anomalies grossières.
- Les correctifs automatiques doivent être traçables.
- Une règle de nettoyage récurrente mérite un module explicite, pas un patch local isolé.

---

## Prévision et scoring de confiance
- Toute logique de prévision doit expliciter ses inputs principaux.
- Le niveau de confiance doit être calculé, stocké ou dérivé de façon compréhensible.
- Les signaux faibles ou absents doivent dégrader la confiance, pas être ignorés.
- Une recommandation critique doit pouvoir indiquer qu’elle repose sur peu d’historique ou sur une source imparfaite.
- Ne pas faire semblant d’être précis au-delà de ce que la donnée permet.

---

## Reporting et métriques
- Distinguer métrique observée, métrique dérivée, estimation et prévision.
- Garder des définitions stables pour les KPI exposés.
- Ne pas changer silencieusement une formule utilisée dans le temps sans le signaler.
- Les allégations chiffrées sensibles doivent rester auditables.
- Préférer des calculs nommés à des enchaînements opaques de transformations.

---

## Traçabilité et explicabilité
- Toute transformation importante doit avoir un ownership clair.
- Une sortie utile doit pouvoir remonter vers sa source et ses étapes de transformation.
- Garder visibles les fallbacks, imputations et corrections automatiques.
- En cas d’incertitude, exposer l’état réel plutôt qu’une confiance artificielle.

---

## Frontières avec domaine et backend
- La couche data prépare, qualifie et enrichit ; le domaine décide du sens métier final.
- Les payloads bruts de source externe ne doivent pas circuler partout.
- Les algorithmes ou heuristiques techniques ne doivent pas imposer leur vocabulaire à l’UI.
- Les adapters techniques restent distincts des règles métier de recommandation.

---

## In scope
- ingestion et parsing
- OCR
- normalisation
- qualité de donnée
- features et prévision
- scoring de confiance
- reporting et agrégations
- explicabilité data

## Hors scope
- UI de visualisation
- contrat HTTP détaillé au-delà des besoins d’exposition
- règles métier finales de décision qui relèvent du domaine
- infrastructure d’exploitation du pipeline
- promesses réglementaires non supportées

---

## Patterns recommandés
- pipeline par étapes explicites
- modèles distincts brut / normalisé / métier
- score de confiance explicite
- métadonnées de source et fraîcheur
- transformations nommées
- résultats auditables

---

## Anti-patterns
- payload OCR brut utilisé comme vérité métier
- nettoyage implicite dispersé dans plusieurs fichiers
- KPI calculé différemment selon l’endroit
- seuils magiques sans ownership
- recommandation “précise” sans signal de confiance
- correction automatique silencieuse
- agrégation opaque impossible à auditer

---

## Checklist de fin
- la source et la fiabilité de la donnée sont claires
- les étapes brut / normalisé / métier sont lisibles
- l’incertitude reste représentée honnêtement
- les transformations importantes sont traçables
- les métriques ont un sens stable
- la prédiction expose ou permet d’inférer son niveau de confiance
- aucun fallback critique n’est caché
