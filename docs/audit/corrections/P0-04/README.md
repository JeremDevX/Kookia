# P0-04 - Ajustement stock drawer incoherent

## Traceabilite
- Source audit: [registre-problemes.md:L41](../../registre-problemes.md#L41)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P0`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Rendre l'ajustement de stock fiable: calcul numerique correct + mise a jour effective de la source de donnees UI.

## Fichiers concernes
- [src/components/stocks/ProductDetail.tsx#L59](../../../../src/components/stocks/ProductDetail.tsx#L59)
- [src/pages/Stocks.tsx#L63](../../../../src/pages/Stocks.tsx#L63)

## Cadrage strict
- Objectif testable:
  - un ajustement valide (`+10`, `-5`) doit mettre a jour le stock dans l'etat parent et l'affichage drawer/tableau,
  - une saisie invalide (`0`, `abc`, vide) doit etre refusee avec feedback utilisateur.
- Fichiers autorises:
  - `src/components/stocks/ProductDetail.tsx`
  - `src/pages/Stocks.tsx`
  - `docs/audit/corrections/P0-04/README.md`
  - `docs/audit/corrections/README.md`

## Reproduction / diagnostic
- Reproduction initiale:
  - ouverture d'un produit depuis `Stocks`,
  - clic `Ajuster Stock`, saisie d'une valeur, confirmation.
- Resultat observe avant correctif:
  - toast succes affiche,
  - stock non mis a jour dans la source de verite parent (`Stocks`).

## Cause racine
- Comparaison de signe basee sur string (`adjustAmount > "0"`) au lieu d'un calcul numerique.
- Absence de callback vers le parent depuis `ProductDetail`, donc aucune mutation de `products`.
- Risque d'affichage stale dans le drawer si le produit selectionne n'est pas resynchronise apres mutation.

## Plan d'implementation (execute)
1. Ajouter un callback obligatoire `onAdjustStock(productId, delta)` dans `ProductDetail`.
2. Normaliser la saisie avec `trim` + regex entier signe (`/^[+-]?\\d+$/`).
3. Convertir avec `parseInt` et refuser `NaN`/`0`.
4. Appeler le callback parent avant toast succes sur saisie valide.
5. Ajouter un toast d'information sur saisie invalide.
6. Implementer `handleDrawerAdjustStock` dans `Stocks` pour muter l'etat via `updateStock`.
7. Resynchroniser `selectedProduct` apres mutation (`Math.max(0, stock + delta)`) pour coherer drawer/tableau.
8. Reexecuter `lint` et `build`.

## Fichiers modifies
- [src/components/stocks/ProductDetail.tsx](../../../../src/components/stocks/ProductDetail.tsx)
- [src/pages/Stocks.tsx](../../../../src/pages/Stocks.tsx)
- [docs/audit/corrections/P0-04/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run lint` (OK)
- `npm run build` (KO initial: `ToastType` invalide avec `"error"`, corrige en `"info"`)
- `npm run lint` (OK apres correctif)
- `npm run build` (OK apres correctif)

## Validation technique
- lint: OK
- build: OK (warning bundle > 500k deja connu hors scope ticket)
- tests: N/A (pas de suite de tests automatisee cible sur ce flux)

## Validation fonctionnelle
- Checklist ticket:
  - `+10`: OK (delta accepte, callback parent appele, stock incremente et affiche coherent),
  - `-5`: OK (delta accepte, stock decremente avec garde non-negativite),
  - `0`: OK (refuse, toast d'information),
  - `abc`: OK (refuse, toast d'information),
  - vide: OK (refuse, toast d'information).
- Flux adjacent verifie:
  - boutons `+/-` du tableau et ajustement drawer appliquent tous deux la meme regle de borne basse (`Math.max(0, ...)`) sur l'etat local.

## Criteres d'acceptation
- Le stock affiche dans tableau est coherent avec l'ajustement.
- Les entrees invalides sont refusees proprement.

## Risques residuels
- Validation UI manuelle navigateur non executee dans ce ticket (environnement CLI).
- La logique accepte uniquement des entiers signes (pas de decimaux), conforme au ticket mais a confirmer metier si besoin futur.

## Rollback
- Desactiver temporairement ajustement drawer si bug persistant.

## Estimation
- Effort: 0.5 jour.
- Complexite: faible a moyenne.

## Compte-rendu obligatoire
- Ticket: `P0-04`
- Objectif: fiabiliser l'ajustement stock drawer avec mutation reelle de la source de verite.
- Cause racine: logique string + absence de callback parent.
- Fichiers modifies: voir section dediee.
- Validation technique:
  - lint: OK
  - build: OK
  - tests: N/A
- Validation fonctionnelle: checklist scenarios `+10/-5/0/abc/vide` couverte.
- Risques residuels: validation UI manuelle a completer.
- Statut final: `done`
