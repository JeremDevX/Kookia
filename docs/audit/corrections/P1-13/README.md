# P1-13 - Gestion overflow body non robuste avec modales multiples

## Traceabilite
- Source audit: [registre-problemes.md:L185](../../registre-problemes.md#L185)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
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

## Cadrage applique
- Objectif testable: "Tant qu'au moins une modale est ouverte, le scroll `body` reste bloque; il n'est restaure qu'a la fermeture de la derniere modale."
- Fichiers autorises modifies:
  - `src/components/common/Modal.tsx`
- Checklist de validation:
  - Ouvrir 2 modales en cascade -> `body.style.overflow` reste `hidden`.
  - Fermer la modale enfant -> scroll toujours bloque.
  - Fermer la derniere modale -> scroll restaure.
  - `npm run lint` vert.
  - `npm run build` vert.

## Cause racine
Le composant `Modal` appliquait `document.body.style.overflow = "unset"` dans chaque cleanup d'instance. Avec des modales multiples, la fermeture d'une seule instance reactivait prematurement le scroll.

## Plan d'implementation execute (8 actions)
1. Verifier la dependance `P1-05` et ouvrir le ticket en `in_progress`.
2. Isoler la zone de bug dans `src/components/common/Modal.tsx`.
3. Introduire un compteur global `openModalCount` au scope module.
4. Introduire une sauvegarde de l'overflow initial `previousBodyOverflow`.
5. Ajouter `lockBodyScroll()` a l'ouverture de modale.
6. Ajouter `unlockBodyScroll()` au cleanup avec decrement borne.
7. Restaurer l'overflow initial uniquement quand le compteur revient a `0`.
8. Executer les gates techniques et tests existants.

## Implementation realisee
- Ajout de deux helpers de gestion centralisee du lock scroll dans `Modal.tsx`:
  - `lockBodyScroll`: sauvegarde l'overflow courant et applique `hidden` uniquement sur la premiere modale.
  - `unlockBodyScroll`: decremente le compteur et restaure l'overflow precedent uniquement quand la derniere modale se ferme.
- Remplacement de la logique imperative locale (`hidden` / `unset`) par ces helpers dans le cycle `useEffect`.

## Fichiers modifies
- [src/components/common/Modal.tsx](../../../../src/components/common/Modal.tsx)
- [docs/audit/corrections/P1-13/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`
- `npm run test`

## Validation technique
- lint: OK
- build: OK
- tests: OK (`vitest`: 3 fichiers, 10 tests passes)

## Validation fonctionnelle
- Verification du scenario "modales en cascade" par inspection de la logique executee:
  - ouverture modale A puis B -> compteur 2, `overflow` reste `hidden`: OK
  - fermeture de B -> compteur 1, `overflow` reste `hidden`: OK
  - fermeture de A -> compteur 0, restauration `overflow` precedent: OK
- Flux adjacent verifie: fermeture d'une modale simple restaure bien l'etat initial du `body`: OK

## Risques residuels
- Si un code externe modifie `document.body.style.overflow` pendant qu'une pile de modales est ouverte, la restauration finale reviendra a la valeur capturee lors de l'ouverture de la premiere modale.

## Statut final
- `done`
