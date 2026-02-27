# P0-01 - Lint en echec (react-refresh/only-export-components)

## Traceabilite
- Source audit: [registre-problemes.md:L9](../../registre-problemes.md#L9)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
- Priorite: `P0`

## Objectif
Retablir un lint vert sur l'ensemble du projet et stabiliser la base qualite.

## Fichiers concernes
- [src/context/CartContext.tsx#L1](../../../../src/context/CartContext.tsx#L1)
- [src/context/ToastContext.tsx#L1](../../../../src/context/ToastContext.tsx#L1)
- [eslint.config.js](../../../../eslint.config.js)

## Plan d'action detaille
1. Diagnostic
- Reproduire l'erreur: `npm run lint`.
- Verifier que l'erreur est uniquement sur `CartContext.tsx`.

2. Design de correction
- Option retenue: separer les exports non-composants et le hook `useCart` dans un fichier dedie.
- Garder `CartProvider` dans un fichier oriente composant.

3. Implementation
- Creer `src/context/cart.types.ts` (types `CartItem`, `CartContextType`).
- Creer `src/context/useCart.ts` (hook `useCart`).
- Garder `CartContext.tsx` focalise sur provider + contexte.
- Mettre a jour imports consommateurs.

4. Validation technique
- Executer `npm run lint`.
- Executer `npm run build`.

5. Validation fonctionnelle
- Verifier panier notification:
  - ajout unitaire,
  - ajout multiple,
  - clear panier,
  - generation commande.

6. Documentation
- Mettre a jour [registre-problemes.md](../../registre-problemes.md) statut/etat si corrige.

## Criteres d'acceptation
- `npm run lint` retourne code 0.
- Aucun changement de comportement du panier.
- Aucun warning react-refresh sur les contextes.

## Risques
- Casse d'imports sur `useCart`.
- Regression de types si export maps incomplets.

## Rollback
- Revenir a la version precedente de `CartContext.tsx`.
- Restaurer imports originels.

## Estimation
- Effort: 0.5 jour.
- Complexite: faible.
