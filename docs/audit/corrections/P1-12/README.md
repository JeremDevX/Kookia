# P1-12 - Bundle principal trop lourd

## Traceabilite
- Source audit: [registre-problemes.md:L176](../../registre-problemes.md#L176)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `done`
- Priorite: `P1`
- Depend de: [P0-01](../P0-01/README.md)

## Objectif
Reduire le JS initial charge pour ameliorer le temps d'affichage et l'interactivite.

## Fichiers concernes
- [src/App.tsx#L2](../../../../src/App.tsx#L2)
- [vite.config.ts](../../../../vite.config.ts)
- pages lourdes + composants chart/modal

## Plan d'action detaille
1. Mesure de reference
- Capturer taille build actuelle et distribution chunks.

2. Optimisations prioritaires
- Lazy load des routes avec `React.lazy` + `Suspense`.
- Charger modules chart uniquement sur pages concernes.
- Verifier imports icones (eviter imports globaux inutiles).

3. Optimisations build
- Ajuster `manualChunks` si necessaire.

4. Validation
- Comparer avant/apres: taille JS initiale et warning Vite.

## Criteres d'acceptation
- Baisse mesurable du chunk principal.
- Navigation route correcte avec fallback loading.

## Risques
- Flash loading plus visible entre routes.

## Rollback
- Revenir a imports statiques sur route problematique.

## Estimation
- Effort: 1 a 2 jours.

## Execution
- Ticket: `P1-12`
- Objectif: reduire la taille du JS initial charge en deferant le chargement des pages non critiques au premier rendu.
- Cause racine: toutes les pages etaient importees statiquement dans `App.tsx`, ce qui forcait le bundling global (incluant modules lourds comme `recharts`) dans le chunk principal.

## Fichiers modifies
- [src/App.tsx](../../../../src/App.tsx)
- [docs/audit/corrections/P1-12/README.md](./README.md)
- [docs/audit/corrections/README.md](../README.md)

## Commandes executees
- `npm run build` (avant correction)
- `npm run build` (apres correction)
- `npm run lint`
- `npm test`

## Validation technique
- lint: `OK`
- build: `OK`
- tests: `OK` (Vitest: 3 fichiers, 10 tests)
- mesure avant/apres build:
  - avant: `dist/assets/index-6j-00bNk.js` = `752.58 kB` (gzip `224.50 kB`) + warning chunk > 500 kB
  - apres: `dist/assets/index-B8m6S1Tt.js` = `274.58 kB` (gzip `87.09 kB`), chunk `Analytics` extrait (`379.05 kB`), warning supprime

## Validation fonctionnelle
- checklist ticket:
  - baisse mesurable du chunk principal: `OK`
  - fallback de chargement present pendant chargement de route (`Suspense`): `OK`
  - routes applicatives conservees (`/`, `/stocks`, `/predictions`, `/recipes`, `/settings`, `/analytics`): `OK` (configuration verifiee dans `App.tsx`)
- regression adjacente verifiee:
  - structure de routing inchangee (meme layout + memes paths): `OK`

## Risques residuels
- apparition d'un etat de chargement court lors de la premiere navigation vers une page non prechargee (comportement attendu du lazy-loading).
