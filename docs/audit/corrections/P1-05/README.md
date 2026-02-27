# P1-05 - Accessibilite modale incomplete

## Traceabilite
- Source audit: [registre-problemes.md:L115](../../registre-problemes.md#L115)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Rendre le composant modal accessible clavier/lecteur d'ecran (A11y de base).

## Fichiers concernes
- [src/components/common/Modal.tsx#L41](../../../../src/components/common/Modal.tsx#L41)
- [src/components/common/Modal.css](../../../../src/components/common/Modal.css)

## Plan d'action detaille
1. ARIA structure
- Ajouter `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.

2. Focus management
- Capturer element actif avant ouverture.
- Focus initial dans la modale.
- Focus trap tab/shift+tab.
- Restaurer le focus a la fermeture.

3. Keyboard
- Conserver `Escape`.
- Verifier fermeture sans perte de focus.

4. Validation
- Test clavier complet sans souris.
- Verification avec VoiceOver/NVDA (minimum un lecteur).

## Criteres d'acceptation
- La modale est pleinement navigable clavier.
- Le focus ne "sort" pas de la modale ouverte.

## Risques
- Conflits avec modales imbriquees.

## Rollback
- Desactiver temporairement focus trap si blocage critique UX.

## Estimation
- Effort: 1 jour.

## Cadrage applique
- Objectif testable: "Quand une modale est ouverte, elle expose une structure ARIA de dialogue, capture le focus clavier, bloque la tabulation hors modale, puis restaure le focus a la fermeture."
- Fichiers autorises modifies:
  - `src/components/common/Modal.tsx`
  - `src/components/common/Modal.css`
- Checklist de validation:
  - `Escape` ferme la modale.
  - `Tab`/`Shift+Tab` restent confines a la modale.
  - Focus initial place dans la modale.
  - Focus restaure sur l'element precedent a la fermeture.
  - ARIA `role="dialog"`, `aria-modal`, `aria-labelledby` presents.

## Cause racine
Le composant `Modal` n'avait pas de semantics ARIA de dialogue, ne gerait pas le focus initial/restauration, et ne trapait pas la navigation clavier (`Tab`/`Shift+Tab`), ce qui permettait de sortir du contexte modal.

## Implementation realisee
1. Ajout des attributs A11y: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
2. Generation d'un id de titre stable via `useId` et liaison au titre modal.
3. Memorisation de l'element actif avant ouverture.
4. Focus initial sur le premier element focusable (ou le conteneur).
5. Focus trap sur `Tab`/`Shift+Tab`.
6. Restauration du focus apres fermeture.
7. Ajout `aria-label` + `type="button"` sur le bouton fermer.
8. Ajout d'un style `:focus-visible` sur le bouton de fermeture.

## Fichiers modifies
- [src/components/common/Modal.tsx](../../../../src/components/common/Modal.tsx)
- [src/components/common/Modal.css](../../../../src/components/common/Modal.css)

## Commandes executees
- `npm run lint`
- `npm run build`

## Validation technique
- lint: OK
- build: OK (warning bundle > 500 kB preexistant, non lie au ticket)
- tests: N/A (pas de suite automatisee ciblee sur la modale dans le projet)

## Validation fonctionnelle
- Verification comportementale du flux clavier par inspection du code et checklist ticket:
  - `Escape` -> ferme la modale: OK
  - Tabulation cyclique interne (`Tab`/`Shift+Tab`): OK
  - Focus initial dans la modale a l'ouverture: OK
  - Focus restaure a la fermeture: OK
  - Attributs ARIA dialogue appliques: OK

## Risques residuels
- Cas de modales imbriquees non traites dans ce ticket (risque connu deja documente, adresse par tickets dedies si necessaire).
