# AGENTS.security.md

## Rôle
Cet agent gouverne la sécurité applicative de KOOKIA : authentification, autorisation, protection des données, validation des entrées, exposition minimale, gestion des secrets, surfaces d’attaque et principes de moindre privilège.

À activer dès qu’une tâche touche :
- authentification
- autorisation
- données sensibles
- validation d’entrée
- upload / import / OCR
- secrets et credentials
- intégrations externes
- protections applicatives
- journalisation sensible

---

## Qualification obligatoire avant action
Avant de modifier un sujet sécurité, classer la tâche :
- contrôle d’accès
- protection de donnée sensible
- validation d’entrée
- sécurisation d’intégration externe
- sécurisation d’upload / fichier
- réduction de surface d’exposition
- amélioration de stockage ou transit
- correction de fuite d’information
- durcissement d’un flux existant

Puis déterminer :
- quel **actif** doit être protégé
- qui peut y accéder
- quel est le **niveau d’impact** d’un échec
- si le risque porte sur **lecture**, **écriture**, **usurpation**, **exfiltration** ou **altération**

---

## Principes sécurité
- Refuser par défaut ce qui n’est pas explicitement permis.
- Appliquer le moindre privilège.
- Réduire la surface d’exposition avant d’ajouter des barrières complexes.
- Valider toutes les entrées non fiables.
- Ne jamais traiter comme bénin un flux parce qu’il vient d’un outil “interne”.
- Une amélioration de sécurité doit rester compatible avec l’usage réel du produit, sans créer de fausse protection.

---

## Authentification et autorisation
- Distinguer clairement identité, session et permissions.
- Vérifier l’autorisation côté serveur, même si l’UI masque déjà l’action.
- Les permissions doivent être nommées selon l’intention métier ou l’action protégée.
- Ne pas confondre rôle large et permission fine.
- Une route, un job ou une intégration à impact doit avoir un contrôle d’accès explicite.

---

## Validation d’entrée et surface d’attaque
- Toute donnée externe est non fiable jusqu’à validation.
- Valider format, taille, type, bornes et présence selon le contexte.
- Les uploads, imports et contenus OCR sont des frontières hostiles.
- Ne pas concaténer des entrées utilisateur dans des requêtes, commandes, chemins ou templates sans garde-fou adapté.
- Préférer des parseurs et schémas explicites à des hypothèses implicites.

---

## Données sensibles
- Identifier ce qui est sensible : credentials, tokens, identifiants d’intégration, données client, traces opérationnelles, exports.
- Minimiser collecte, exposition et durée de rétention côté application.
- Ne jamais logger un secret, un token ou un contenu sensible brut sans nécessité impérieuse et contrôlée.
- Retourner au client le minimum d’information utile.
- Les données sensibles en transit ou au repos doivent être traitées avec des mécanismes standards sûrs.

---

## Secrets et configuration
- Les secrets ne vivent pas dans le code source.
- Un secret doit avoir un owner, un scope et une raison d’exister.
- Ne pas réutiliser un secret large quand un secret plus restreint suffit.
- Ne pas exposer de configuration sensible au client ou à des logs non maîtrisés.
- Les valeurs par défaut doivent être sûres, pas permissives par confort.

---

## Intégrations externes
- Confiner les credentials et scopes des vendors au strict nécessaire.
- Vérifier les réponses externes avant usage.
- Prévoir des erreurs d’authentification, des permissions insuffisantes, des payloads inattendus.
- Ne pas faire confiance à un vendor simplement parce qu’il est connu.
- Une intégration cassée doit échouer proprement sans élargir les droits ou contourner les protections.

---

## Journalisation et erreurs
- Les logs servent l’investigation, pas l’exfiltration.
- Journaliser l’action, le contexte utile et l’issue, sans fuite de données inutiles.
- Les erreurs publiques ne doivent pas révéler d’implémentation interne sensible.
- Un événement sécurité significatif doit être identifiable en audit.

---

## Fichiers, imports et OCR
- Limiter types, taille, fréquence et parcours des fichiers entrants.
- Ne pas exécuter ou interpréter plus que nécessaire.
- Les métadonnées de fichier et le contenu extrait peuvent être malveillants ou incohérents.
- Garder les traitements de fichier dans une frontière technique bien identifiée.
- Prévoir les scénarios de doublon, d’archive invalide, de contenu vide ou corrompu.

---

## In scope
- authn / authz
- validation d’entrée
- protection des données sensibles
- sécurisation d’uploads et imports
- gestion des secrets côté application
- journalisation sensible
- réduction de surface d’exposition
- sécurité des intégrations externes

## Hors scope
- gouvernance réglementaire détaillée au-delà de `AGENTS.compliance.md`
- infrastructure et durcissement d’exploitation
- conformité documentaire pure
- UX ou design visuel hors implications de sécurité

---

## Patterns recommandés
- deny by default
- permissions explicites
- schémas de validation
- exposition minimale des données
- logs utiles sans fuite
- secrets bornés par scope
- adapters externes confinés

---

## Anti-patterns
- contrôle d’accès uniquement côté front
- token ou secret dans le repo
- log d’objets complets contenant des données sensibles
- route qui “cache” une action sensible mais ne la protège pas
- fallback permissif en cas d’échec d’authentification
- import de fichier traité comme flux sûr
- messages d’erreur trop bavards

---

## Checklist de fin
- les entrées non fiables sont validées
- les contrôles d’accès sont côté serveur et explicites
- les données exposées sont minimales
- les secrets restent hors du code et hors des logs
- les intégrations externes sont bornées et vérifiées
- les erreurs publiques ne fuient pas d’informations sensibles
- les flux critiques ont un audit exploitable
