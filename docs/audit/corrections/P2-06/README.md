# P2-06 - Touche Escape ferme plusieurs modales empilees

## Traceabilite
- Source audit: [registre-problemes.md](../../registre-problemes.md)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P2`
- Depend de: [P1-05](../P1-05/README.md), [P1-13](../P1-13/README.md)

## Objectif
Garantir qu'un appui sur `Escape` ne ferme que la modale active (sommet de pile), y compris dans les scenarios de modales imbriquees.

## Fichiers concernes
- [src/components/common/Modal.tsx](../../../../src/components/common/Modal.tsx)
- [src/components/layout/Notifications.tsx](../../../../src/components/layout/Notifications.tsx)

## Plan d'action detaille
1. Introduire une notion de pile modale active (identifiant d'instance + ordre d'ouverture).
2. Restreindre la gestion `Escape` a la modale top-most uniquement.
3. Conserver le comportement existant de lock scroll (compteur) sans regression.
4. Ajouter un test de comportement modales en cascade (parent/enfant).
5. Verifier les flux existants:
   - modal simple,
   - notifications -> generateur de commandes.
6. Executer `lint`, `build`, `test`.

## Criteres d'acceptation
- `Escape` ferme uniquement la derniere modale ouverte.
- Les autres modales restent ouvertes tant que l'utilisateur ne les ferme pas explicitement.
- Aucun impact negatif sur focus management et lock body overflow.

## Risques
- Complexification de la gestion globale des modales si la pile n'est pas nettoyee correctement en unmount.
- Risque d'interaction inattendue avec d'autres listeners globaux clavier.

## Rollback
- Revenir au comportement actuel et desactiver temporairement les enchainements de modales si un bug bloquant est detecte.

## Estimation
- Effort: 0.5 jour.
- Complexite: moyenne.
