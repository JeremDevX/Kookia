# P0-01 - Lint en echec (react-refresh/only-export-components)

## Traceabilite
- Source audit: [registre-problemes.md:L9](../../registre-problemes.md#L9)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P0`

## Objectif
Retablir un lint vert en supprimant l'export non-composant de `CartContext.tsx` qui viole `react-refresh/only-export-components`.

## Cadrage strict
### Objectif testable
- `npm run lint` retourne 0 sans erreur `react-refresh/only-export-components`.
- Les flux panier conservent les memes API (`CartProvider`, `useCart`, `CartItem`).

### Fichiers autorises
- [src/context/CartContext.tsx](../../../../src/context/CartContext.tsx)
- [src/context/useCart.ts](../../../../src/context/useCart.ts)
- [src/context/cart.types.ts](../../../../src/context/cart.types.ts)
- [src/context/cart.context.ts](../../../../src/context/cart.context.ts)
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/components/layout/Notifications.tsx](../../../../src/components/layout/Notifications.tsx)
- [docs/audit/corrections/P0-01/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Reproduction / diagnostic
### Reproduction
Commande:
```bash
npm run lint
```

Resultat initial:
- erreur sur `src/context/CartContext.tsx:78:14`
- regle: `react-refresh/only-export-components`
- message: fichier exporte un composant et une fonction non composant (`useCart`)

### Cause racine
`CartContext.tsx` melangeait:
- export composant (`CartProvider`),
- export hook (`useCart`),
- export types.

La regle Fast Refresh exige un fichier oriente composant uniquement.

## Plan d'implementation (execute)
1. Extraire les types panier dans `cart.types.ts`.
2. Extraire le contexte React dans `cart.context.ts`.
3. Garder `CartContext.tsx` centre sur `CartProvider` uniquement.
4. Extraire `useCart` dans `useCart.ts`.
5. Mettre a jour imports consommateurs (`Dashboard`, `Notifications`).
6. Reexecuter gates qualite (`lint`, `build`).

## Fichiers modifies
- [src/context/CartContext.tsx](../../../../src/context/CartContext.tsx)
- [src/context/useCart.ts](../../../../src/context/useCart.ts)
- [src/context/cart.types.ts](../../../../src/context/cart.types.ts)
- [src/context/cart.context.ts](../../../../src/context/cart.context.ts)
- [src/pages/Dashboard.tsx](../../../../src/pages/Dashboard.tsx)
- [src/components/layout/Notifications.tsx](../../../../src/components/layout/Notifications.tsx)

## Validation technique
- `npm run lint`: OK
- `npm run build`: OK
- tests ticket-specifiques: N/A (aucun framework de test configure)

## Validation fonctionnelle
Checklist cible panier/notification verifiee par conservation d'API et absence de changement de logique metier:
- ajout unitaire: OK (signature `addToCart` et payload inchanges)
- ajout multiple: OK (signature `addMultipleToCart` inchangee)
- clear panier: OK (`clearCart` inchange)
- generation commande: OK (`cartItems` toujours consommé dans `Dashboard` et `Notifications`)

## Risques residuels
- Validation UI manuelle navigateur non executee dans ce ticket (environnement CLI uniquement).
- Risque faible de regression visuelle/interactionnelle hors logique panier.

## Rollback
- Revenir au precedent decoupage `CartContext.tsx` (hook + contexte + types centralises) si besoin.

## Compte-rendu obligatoire
- Ticket: `P0-01`
- Objectif: corriger l'erreur lint `react-refresh/only-export-components`.
- Cause racine: exports non-composants dans un fichier composant.
- Fichiers modifies: voir section dediee.
- Validation technique:
  - lint: OK
  - build: OK
  - tests: N/A
- Validation fonctionnelle: checklist panier couverte par invariance d'API.
- Risques residuels: validation UI manuelle a completer.
- Statut final: `done`
