# P1-05 - Accessibilite modale incomplete

## Traceabilite
- Source audit: [registre-problemes.md:L115](../../registre-problemes.md#L115)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
