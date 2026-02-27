# Best Practices Agent (Instructions Normatives)

Version: 1.0
Statut: obligatoire
Portee: tout travail AI sur ce repo

## 1) Principes directeurs
- Priorite 1: corriger la cause racine, pas seulement le symptome.
- Priorite 2: minimiser le risque de regression.
- Priorite 3: garder le code lisible et maintenable.
- Toujours preferer la solution la plus simple qui passe les gates qualite.

## 2) Regles de scope
- Traiter un ticket a la fois.
- Respecter strictement les fichiers du ticket.
- Toute extension de scope DOIT etre justifiee et tracee.

## 3) Standards de code
- Garder types stricts, eviter `any`.
- Eviter duplication: extraire helper si repetition reelle.
- Garder une seule source de verite pour l'etat.
- Ne pas coupler le domaine aux mocks.

## 4) Standards React
- Preferer composants purs et predictibles.
- Eviter effets de bord inutiles dans `useEffect`.
- Deriver le state au lieu de le dupliquer quand possible.
- Gerer explicitement loading/error/empty states.

## 5) Standards CSS/UI
- Utiliser une strategie CSS coherente (pas de melange non controle).
- Eviter styles imperatifs via `e.currentTarget.style`.
- Utiliser des tokens CSS centralises.
- Verifier responsive desktop/mobile sur chaque changement UI.

## 6) Standards data
- Flux cible: pages -> hooks -> services -> source data.
- Pas d'import direct `MOCK_*` depuis pages (sauf cas transitoire documente).
- Normaliser dates et formats (timezone explicite).

## 7) Tests et validation
- Minimum obligatoire par ticket:
  - `npm run lint`
  - `npm run build`
- Ajouter tests unitaires pour toute logique metier nouvelle/modifiee.
- Ajouter tests d'integration pour flux critiques modifies.

## 8) Review AI (deuxieme passe obligatoire)
- Faire une passe "bug hunter" avant cloture:
  - cas limites,
  - regressions adjacentes,
  - coherence type/UX.
- Classer findings par severite P0/P1/P2.
- Corriger P0/P1 avant merge.

## 9) Documentation et tracabilite
- Mettre a jour la fiche ticket a chaque changement majeur.
- Documenter:
  - pourquoi,
  - quoi,
  - comment valide,
  - risques residuels.
- Conserver les liens vers fichiers et lignes impactees.

## 10) Performance et accesibilite
- Ne pas introduire de regressions bundle sans justification.
- Favoriser lazy loading pour pages lourdes.
- Garantir navigation clavier pour modales/actions principales.

## 11) Securite et robustesse
- Ne jamais exposer secret/token dans le code.
- Valider les entrees utilisateur (type, borne, format).
- Prevoir messages d'erreur clairs pour utilisateur et logs techniques.

## 12) Anti-patterns interdits
- "Quick fix" sans validation technique.
- Comparaisons de nombres en string.
- Ajout de logique metier dans composants UI sans abstraction.
- Refactor massif non demande dans un ticket cible.
- Cloture ticket sans preuves lint/build et check-list fonctionnelle.

## 13) Definition of Done agent
Un ticket est considere fini seulement si:
- implementation complete,
- gates techniques vertes,
- check-list fonctionnelle validee,
- documentation ticket a jour,
- aucun risque critique non traite.

