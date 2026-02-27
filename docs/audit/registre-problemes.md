# Registre détaillé des problèmes / zones louches

## Convention sévérité
- P0: bloquant / fort risque de régression ou de blocage livraison
- P1: important (fonctionnel, dette technique, qualité)
- P2: amélioration importante mais non bloquante à court terme

## P0
### P0-01 - Lint en échec
- Symptôme: `npm run lint` échoue avec la règle `react-refresh/only-export-components`.
- Impact: pipeline qualité cassé, merge/release fragilisés.
- Fichiers liés:
  - `src/context/CartContext.tsx:1`
  - `src/context/CartContext.tsx:78`
- Correctif conseillé:
  - soit déplacer types/hooks hors fichier composant provider,
  - soit aligner la stratégie avec `ToastContext` (fichier séparé + exports propres).

### P0-02 - Architecture data prévue non branchée au runtime
- Symptôme: les pages principales importent les `MOCK_*` directement au lieu d'utiliser hooks/services.
- Impact: impossible d'activer une vraie API sans refonte des pages; documentation trompeuse.
- Fichiers liés:
  - `src/pages/Dashboard.tsx:12`
  - `src/pages/Stocks.tsx:10`
  - `src/pages/Predictions.tsx:15`
  - `src/pages/Recipes.tsx:8`
  - `src/pages/Analytics.tsx:9`
  - `src/hooks/useProducts.ts:17`
  - `src/services/productService.ts:13`
- Correctif conseillé:
  - brancher les pages sur les hooks (`useProducts`, `usePredictions`, `useRecipes`, `useAnalytics`) puis faire converger vers API.

### P0-03 - Bug de state sur quantité de production
- Symptôme: `ProductionConfirmModal` initialise `quantity` avec `maxYield` une seule fois; changement de recette ne réinitialise pas.
- Impact: quantité par défaut potentiellement fausse, risques d'actions incohérentes.
- Fichiers liés:
  - `src/components/recipes/ProductionConfirmModal.tsx:29`
- Correctif conseillé:
  - synchroniser `quantity` avec `maxYield` via `useEffect` sur ouverture/modal recipe.

### P0-04 - Ajustement de stock incohérent dans le drawer produit
- Symptôme:
  - comparaison string `adjustAmount > "0"`,
  - ajustement non propagé à l'état parent `products`.
- Impact: feedback mensonger (toast "Stock ajusté" sans modification réelle), risque métier élevé.
- Fichiers liés:
  - `src/components/stocks/ProductDetail.tsx:59`
  - `src/components/stocks/ProductDetail.tsx:64`
  - `src/pages/Stocks.tsx:19`
- Correctif conseillé:
  - typer/normaliser en `number` et fournir un callback parent `onAdjustStock`.

### P0-05 - Stratégie CSS incohérente (classes utilitaires non supportées)
- Symptôme: nombreuses classes type Tailwind dans JSX, mais Tailwind absent des dépendances.
- Impact: styles silencieusement non appliqués, rendu imprévisible selon composants.
- Fichiers liés:
  - `package.json` (pas de `tailwindcss`)
  - `src/pages/Stocks.tsx:157`
  - `src/components/dashboard/InvoiceModal.tsx:30`
  - `src/components/analytics/ExportReportModal.tsx:33`
- Correctif conseillé:
  - soit installer/configurer Tailwind,
  - soit remplacer ces classes par classes CSS existantes projet.

### P0-06 - Variables CSS référencées mais non définies
- Symptôme: `--shadow-xl` et `--font-size-md` utilisés mais absents des tokens.
- Impact: propriétés ignorées par le navigateur (ex: ombres modales absentes).
- Fichiers liés:
  - `src/components/common/Modal.css:19`
  - `src/components/stocks/ProductDetail.css:22`
  - `src/pages/Dashboard.css:372`
  - `src/pages/Predictions.css:752`
  - `src/styles/index.css:1`
- Correctif conseillé:
  - définir explicitement ces variables ou remplacer par variables existantes.

### P0-07 - Validation numérique permissive malgré le ticket P2-02
- Symptôme: des entrées partielles invalides (`12abc`, `5abc`, `10xyz`) passent la validation (`parseInt`/`parseFloat` tolérants) et sont acceptées comme valeurs valides.
- Impact: états métier incohérents possibles sur stocks/production, avec risque de données erronées malgré des contrôles affichés.
- Fichiers liés:
  - `src/utils/formValidation.ts:40`
  - `src/utils/formValidation.ts:74`
  - `src/utils/formValidation.ts:106`
  - `src/utils/formValidation.ts:137`
  - `src/utils/formValidation.test.ts:1`
- Correctif conseillé:
  - introduire un parsing strict (regex entière/décimale complète),
  - ajouter tests de non-régression pour formats partiels invalides.

## P1
### P1-01 - Logique d'urgence discutable dans les prédictions
- Symptôme: urgent/modéré basé sur `confidence` uniquement, pas sur l'action recommandée.
- Impact: items "wait" classés urgents, UX décisionnelle trompeuse.
- Fichiers liés:
  - `src/pages/Predictions.tsx:56`
  - `src/pages/Predictions.tsx:57`
- Correctif conseillé:
  - dériver priorité d'un score combinant action, horizon temporel, stock réel, confiance.

### P1-02 - Recommandations passées encore proposées dans Dashboard
- Symptôme: prédictions passées (`Livré ✓`) encore visibles comme actions prioritaires.
- Impact: bruit opérationnel, erreurs de commande.
- Fichiers liés:
  - `src/utils/mockData.ts:260`
  - `src/pages/Dashboard.tsx:97`
- Correctif conseillé:
  - filtrer par date >= aujourd'hui et par action pertinente (`buy`), séparément des historiques.

### P1-03 - Sélection commandes Dashboard non remise à zéro
- Symptôme: fermeture du générateur vide le panier global mais pas `selectedPredictionIds`.
- Impact: état local persistant ambigu (items masqués/sélectionnés durablement).
- Fichiers liés:
  - `src/pages/Dashboard.tsx:85`
  - `src/pages/Dashboard.tsx:97`
- Correctif conseillé:
  - clarifier le flux (confirmé = archivé) ou reset explicite après envoi.

### P1-04 - Gestion de dates sensible au fuseau horaire
- Symptôme: usage récurrent de `toISOString().split("T")[0]` pour date métier locale.
- Impact: décalages de jour possibles selon timezone/DST.
- Fichiers liés:
  - `src/utils/mockData.ts:246`
  - `src/pages/Dashboard.tsx:113`
  - `src/components/layout/Notifications.tsx:200`
- Correctif conseillé:
  - utiliser une librairie date locale (`date-fns/format`) avec timezone explicite.

### P1-05 - Accessibilité modale incomplète
- Symptôme: pas de `role="dialog"`, `aria-modal`, focus trap robuste.
- Impact: navigation clavier/lecteurs d'écran dégradée.
- Fichiers liés:
  - `src/components/common/Modal.tsx:41`
- Correctif conseillé:
  - ajouter attributs ARIA, focus initial, piégeage/restauration focus.

### P1-06 - Top bar non contextualisée
- Symptôme: breadcrumb page figé à "Dashboard".
- Impact: mauvaise orientation utilisateur hors dashboard.
- Fichiers liés:
  - `src/components/layout/TopNav.tsx:23`
- Correctif conseillé:
  - dériver le libellé depuis `location.pathname`.

### P1-07 - Lien support non fonctionnel
- Symptôme: `href="#"` en sidebar.
- Impact: comportement inutile/scroll top, UX non finalisée.
- Fichiers liés:
  - `src/components/layout/Sidebar.tsx:75`
- Correctif conseillé:
  - router vers vraie page support/help ou retirer le lien temporairement.

### P1-08 - Paramétrage analytics non persistant
- Symptôme: sauvegarde = `console.log` + toast.
- Impact: faux sentiment de sauvegarde, perte de confiance.
- Fichiers liés:
  - `src/pages/Analytics.tsx:31`
- Correctif conseillé:
  - stockage local/serveur et rechargement de préférences.

### P1-09 - Styles injectés à chaque instance de Input
- Symptôme: `<style>` embarqué dans composant `Input`.
- Impact: duplication DOM/CSS, maintenance compliquée.
- Fichiers liés:
  - `src/components/common/Input.tsx:33`
- Correctif conseillé:
  - extraire vers fichier CSS unique ou CSS modules.

### P1-10 - Code mort / non utilisé
- Symptôme:
  - `ActivityChart` présent mais non monté,
  - hooks/services data créés mais peu consommés.
- Impact: complexité inutile, confusion architecture.
- Fichiers liés:
  - `src/components/dashboard/ActivityChart.tsx:18`
  - `src/pages/Dashboard.tsx:1`
  - `src/hooks/index.ts:1`
  - `src/services/index.ts:1`
- Correctif conseillé:
  - soit intégrer réellement, soit supprimer.

### P1-11 - Absence de tests automatisés
- Symptôme: aucun fichier test/spec détecté.
- Impact: régressions probables lors des refactors (notamment sur logique stock/commande).
- Fichiers liés:
  - ensemble du dépôt `src/`
- Correctif conseillé:
  - ajouter tests unitaires hooks/services + tests UI critiques.

### P1-12 - Bundle principal trop lourd
- Symptôme: warning build chunk > 500kB.
- Impact: perf réseau et TTI pénalisés.
- Fichiers liés:
  - `src/App.tsx:2` (routes importées statiquement)
  - build output (`npm run build`)
- Correctif conseillé:
  - lazy loading par route + optimisation chart/icon imports.

### P1-13 - Overflow body non robuste avec modales multiples
- Symptôme: chaque modal force `document.body.style.overflow = "unset"` au cleanup.
- Impact: réouverture du scroll possible si plusieurs modales se chevauchent.
- Fichiers liés:
  - `src/components/common/Modal.tsx:28`
  - `src/components/common/Modal.tsx:34`
- Correctif conseillé:
  - gestion de compteur global de modales ouvertes.

### P1-14 - Priorisation prédictions encore sensible au fuseau client
- Symptôme: la priorité (`getPredictionPriority`) et certains filtres date comparent au "today" local navigateur au lieu du jour métier restaurant.
- Impact: selon le fuseau utilisateur, une même prédiction peut changer de statut (`today` vs `J+1`) et modifier les actions proposées.
- Fichiers liés:
  - `src/services/predictionService.ts:17`
  - `src/services/predictionService.ts:41`
  - `src/pages/Dashboard.tsx:113`
  - `src/utils/date.ts:1`
- Correctif conseillé:
  - normaliser tous les calculs de jour sur le fuseau métier (restaurant),
  - centraliser la comparaison de dates dans un utilitaire commun testé.

### P1-15 - Stratégie CSS encore incomplète (classes utilitaires orphelines restantes)
- Symptôme: de nombreuses classes utilitaires de style Tailwind restent présentes sans définition CSS projet (ex: `bg-blue-50`, `grid-cols-3`, `p-4`, `rounded-lg`, `border-b`).
- Impact: rendu partiellement non déterministe et incohérence avec le ticket `P0-05` annoncé comme terminé.
- Fichiers liés:
  - `src/components/recipes/ProductionConfirmModal.tsx:75`
  - `src/components/predictions/PredictionDetailModal.tsx:58`
  - `src/components/analytics/CustomizeAnalyticsModal.tsx:48`
  - `src/components/dashboard/MenuIdeasModal.tsx:19`
  - `src/styles/index.css:158`
- Correctif conseillé:
  - terminer l’inventaire global des classes orphelines,
  - remplacer par classes CSS projet ou définir explicitement les utilitaires nécessaires.

## P2
### P2-01 - Valeurs métiers hardcodées partout
- Symptôme: utilisateur, météo, fournisseurs, prix, ROI, etc. en dur.
- Impact: faible réutilisabilité multi-client/multi-site.
- Fichiers liés:
  - `src/pages/Dashboard.tsx:131`
  - `src/components/dashboard/MenuIdeasModal.tsx:15`
  - `src/components/analytics/ROISimulator.tsx:12`
- Correctif conseillé:
  - centraliser configuration métier + endpoints data.

### P2-02 - Validation de formulaires limitée
- Symptôme: peu de garde-fous (valeurs négatives, dépassement max, etc.).
- Impact: états incohérents possibles.
- Fichiers liés:
  - `src/components/stocks/AddProductModal.tsx:114`
  - `src/components/recipes/RecordProductionModal.tsx:69`
  - `src/components/recipes/ProductionConfirmModal.tsx:70`
- Correctif conseillé:
  - schéma de validation (zod/yup ou validation maison centralisée).

### P2-03 - Mutation directe de style DOM en React
- Symptôme: hover géré via mutation `e.currentTarget.style`.
- Impact: styles dispersés, maintenance faible, plus difficile à tester.
- Fichiers liés:
  - `src/components/layout/Notifications.tsx:326`
  - `src/components/layout/Notifications.tsx:452`
- Correctif conseillé:
  - déplacer vers classes CSS + pseudo-classes.

### P2-04 - Couplage type domaine vers fichier mock
- Symptôme: imports `type ... from ../utils/mockData` dans plusieurs composants.
- Impact: dépendance inversée (domaine dépend du mock).
- Fichiers liés:
  - `src/components/common/Badge.tsx:3`
  - `src/pages/Dashboard.tsx:13`
  - `src/components/predictions/PredictionDetailModal.tsx:6`
  - `src/components/recipes/ProductionConfirmModal.tsx:12`
- Correctif conseillé:
  - importer les types uniquement depuis `src/types`.

### P2-05 - Documentation README en décalage avec l'implémentation
- Symptôme: README décrit flux hooks/services "déjà gérés"; runtime réel contourne ces couches.
- Impact: onboarding trompeur, erreurs d'estimation.
- Fichiers liés:
  - `README.md:166`
  - `src/pages/Dashboard.tsx:12`
  - `src/pages/Stocks.tsx:10`
  - `src/pages/Predictions.tsx:15`
- Correctif conseillé:
  - mettre à jour README selon état réel ou finaliser l'architecture promise.

### P2-06 - Gestion `Escape` non isolée sur modales empilées
- Symptôme: chaque modal enregistre un listener `keydown` document; sur `Escape`, plusieurs modales peuvent se fermer en cascade.
- Impact: UX/a11y fragile sur scénarios imbriqués (ex: notifications -> générateur de commande), fermeture plus large que l’intention utilisateur.
- Fichiers liés:
  - `src/components/common/Modal.tsx:82`
  - `src/components/common/Modal.tsx:110`
  - `src/components/layout/Notifications.tsx:504`
- Correctif conseillé:
  - n’autoriser la fermeture `Escape` que pour la modal au sommet de pile (stack LIFO),
  - ajouter un test de comportement pour modales imbriquées.
