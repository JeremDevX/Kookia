# P1-13 - Gestion overflow body non robuste avec modales multiples

## Traceabilite
- Source audit: [registre-problemes.md:L185](../../registre-problemes.md#L185)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P1`
- Depend de: [P1-05](../P1-05/README.md)

## Objectif
Garantir un lock scroll robuste meme avec plusieurs modales ouvertes/fermees en cascade.

## Fichiers concernes
- [src/components/common/Modal.tsx#L28](../../../../src/components/common/Modal.tsx#L28)
- [src/components/common/Modal.tsx#L34](../../../../src/components/common/Modal.tsx#L34)

## Plan d'action detaille
1. Design
- Introduire compteur global de modales ouvertes (module scope ou context).

2. Implementation
- Incremente a l'ouverture, decremente a la fermeture.
- Appliquer `body.style.overflow = 'hidden'` si compteur > 0.
- Restaurer seulement quand compteur revient a 0.

3. Validation
- Scenario modales imbriquees (notifications -> order generator).
- Verifier scroll body toujours bloque/debloque correctement.

## Criteres d'acceptation
- Plus de reactivation prematuree du scroll.

## Risques
- Fuite de compteur si unmount anormal.

## Rollback
- Revenir mecanisme simple si bug bloquant, avec restriction "une seule modale" temporaire.

## Estimation
- Effort: 0.5 jour.
