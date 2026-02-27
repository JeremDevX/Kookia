# P1-12 - Bundle principal trop lourd

## Traceabilite
- Source audit: [registre-problemes.md:L176](../../registre-problemes.md#L176)
- Process standard: [PROCESS_STANDARD.md](../PROCESS_STANDARD.md)
- Statut: `open`
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
