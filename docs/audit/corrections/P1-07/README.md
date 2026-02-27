# P1-07 - Lien support non fonctionnel

## Traceabilite
- Source audit: [registre-problemes.md:L131](../../registre-problemes.md#L131)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`

## Objectif
Remplacer le lien support factice par une navigation valide et utile.

## Fichiers concernes
- [src/components/layout/Sidebar.tsx#L75](../../../../src/components/layout/Sidebar.tsx#L75)
- [src/App.tsx#L23](../../../../src/App.tsx#L23)

## Plan d'action detaille
1. Choix fonctionnel
- Option A: page `/support` interne.
- Option B: lien externe support (mail/helpdesk).

2. Implementation
- Remplacer `href="#"`.
- Si route interne: creer page minimale + route.

3. Validation
- Verifier clic support desktop/mobile.

## Criteres d'acceptation
- Le clic support mene a une destination valide.

## Risques
- Destination non disponible en environnement offline.

## Rollback
- Cacher temporairement l'entree support si backend help indisponible.

## Estimation
- Effort: 0.25 jour.

## Execution
- Objectif testable:
  - Cliquer "Support" dans la sidebar ouvre une destination valide (client mail) au lieu d'un `href="#"`.
- Cause racine:
  - Le lien support etait un placeholder statique (`href="#"`) sans destination fonctionnelle.
- Choix d'implementation:
  - Option B appliquee: lien `mailto:` pour fournir une destination utile sans etendre le scope (pas de nouvelle page/route).

## Fichiers modifies
- [src/components/layout/Sidebar.tsx](../../../../src/components/layout/Sidebar.tsx)
- [docs/audit/corrections/P1-07/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint`
- `npm run build`

## Validation technique
- lint: `OK`
- build: `OK` (warning bundle > 500 kB preexistant, non lie a ce ticket)
- tests: `N/A` (pas de suite automatisee specifique au ticket)

## Validation fonctionnelle
- Checklist:
  - clic sur "Support" ne pointe plus vers `#`: `OK`
  - destination valide (`mailto:support@kookia.app`): `OK`
  - fermeture sidebar au clic (mobile) conservee via `onClick={handleNavClick}`: `OK`

## Risques residuels
- En environnement sans client mail configure, l'action peut ne pas aboutir a l'ouverture d'une fenetre de composition.
- L'adresse `support@kookia.app` doit etre operationnelle cote support pour un traitement effectif.

## Rollback
- Revenir a une route interne `/support` si la strategie email evolue ou si le mailto n'est pas adapte a certains environnements.

## Statut final
- `done`
