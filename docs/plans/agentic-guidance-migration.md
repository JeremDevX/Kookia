# Plan — migration de guidance agentique

> Archive : l'affirmation « frontend sur mocks » décrit l'état initial de cette
> migration, pas le runtime actuel. Voir [la référence technique](../technical-development.md).

## Objectif

Remplacer les guides `AGENTS.<sujet>.md` pseudo-routés par un socle `AGENTS.md`
minimal et des Skills Codex locaux à découverte native.

## Contraintes et décisions

- Le runtime est une application React/TypeScript sur mocks locaux ; aucune
  architecture backend ne doit être présentée comme active.
- Conserver les invariants produit, domaine, scope et validation utile sans
  procédure obligatoire pour les petites tâches.
- Ne pas créer de configuration Codex projet : aucune option locale n'est
  nécessaire pour découvrir `AGENTS.md` et `.agents/skills`.

## Étapes

- [x] Auditer les instructions, la stack, la CI, les frontières et la documentation.
- [x] Vérifier les surfaces Codex et la découverte officielle.
- [x] Réduire le root, créer les Skills et supprimer les pseudo-guides.
- [x] Aligner README et la note de décision, puis vérifier discovery et liens.
- [x] Relire le diff et exécuter les contrôles documentaires proportionnés.
