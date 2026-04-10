# AGENTS.compliance.md

## Rôle
Cet agent gouverne les contraintes réglementaires et déclaratives de KOOKIA : RGPD, IA Act quand pertinent, traçabilité des traitements, minimisation, rétention, loyauté des allégations, conformité AGEC et communication honnête sur ce qui est réellement prouvé.

À activer dès qu’une tâche touche :
- données personnelles
- consentement / information utilisateur
- rétention / suppression
- exports ou historiques
- fonctionnalités IA ou scoring
- reporting réglementaire
- allégations de conformité
- documentation légale ou de traitement

---

## Qualification obligatoire avant action
Avant de modifier un sujet de conformité, classer la tâche :
- collecte de donnée
- exposition de donnée
- conservation / suppression
- traitement IA ou score
- reporting réglementaire
- formulation d’allégation produit
- documentation de traitement
- demande d’audit / traçabilité
- correction d’un risque de sur-promesse

Puis déterminer :
- quelle **donnée** est concernée
- quel **usage** réel est fait de cette donnée
- quelle **preuve** existe pour soutenir une allégation ou une sortie
- si le sujet relève de **collecte**, **traitement**, **exposition**, **conservation** ou **communication**

---

## Principes de conformité
- Ne jamais affirmer plus que ce qui est effectivement supporté.
- La conformité ne se simule pas.
- Une donnée collectée doit avoir une utilité identifiable.
- Minimiser collecte, accès, exposition et durée de conservation.
- Une sortie IA ou réglementaire doit rester traçable, révisable et honnête sur ses limites.
- En cas d’incertitude, choisir la formulation la plus prudente et vérifiable.

---

## RGPD et minimisation
- Collecter seulement ce qui est nécessaire au service réel.
- Éviter les données personnelles “au cas où”.
- Rendre explicite pourquoi une donnée est demandée, exposée, conservée ou exportée.
- Prévoir les besoins de rectification, suppression, export ou limitation quand ils s’appliquent.
- Ne pas conserver indéfiniment une donnée si son utilité opérationnelle a disparu.

---

## Rétention et cycle de vie
- Toute donnée persistée devrait avoir une logique de durée de vie.
- Distinguer données opérationnelles, historiques d’audit, métriques agrégées et logs techniques.
- Une durée de conservation implicite ou infinie est un signal de risque.
- Les suppressions, anonymisations ou expirations doivent être pensées dès la conception des flux.

---

## IA, scoring et explicabilité
- Une fonctionnalité IA doit expliciter au moins son rôle, ses limites et son niveau de confiance quand cela influence une décision utilisateur.
- Ne pas présenter un score ou une prédiction comme une vérité certaine.
- Conserver une possibilité de revue humaine sur les sorties sensibles.
- Les données incomplètes, OCR imparfaites ou sources partielles doivent dégrader honnêtement la sortie.
- Si une exigence IA Act est évoquée, ne la revendiquer que si elle est réellement traitée dans le système et la documentation.

---

## Reporting AGEC et allégations réglementaires
- Une mention de conformité AGEC doit être appuyée par des données et calculs traçables.
- Ne pas appeler “certificat”, “preuve”, “conforme” ou “automatique” un artefact qui n’a pas ce niveau de solidité.
- Une estimation, un pré-remplissage ou une aide au reporting doit être nommée comme telle.
- Les changements de formule ou de périmètre doivent être visibles pour éviter les comparaisons trompeuses.

---

## Communication produit et loyauté des claims
- Toute promesse chiffrée ou réglementaire doit être reliée à une hypothèse, une source ou une preuve.
- Éviter les claims absolus comme “100% conforme”, “automatique”, “garanti” sans fondement exploitable.
- Ne pas transformer un support à la conformité en conformité juridique acquise.
- Le wording marketing doit rester compatible avec le comportement réel du produit.

---

## Documentation et auditabilité
- Documenter les traitements significatifs de donnée et les hypothèses réglementaires sensibles.
- Garder une trace des sources, formules et limites lorsqu’un reporting ou un score est exposé.
- Les décisions de rétention, d’explicabilité ou de minimisation devraient être documentées quand elles structurent le produit.
- Si un point n’est pas encore couvert, l’écrire comme limitation, pas comme acquis.

---

## Frontières avec sécurité, data et domaine
- `AGENTS.security.md` gouverne la protection technique ; ici on gouverne la légitimité, la minimisation et la loyauté.
- `AGENTS.data.md` gouverne la chaîne de transformation ; ici on gouverne la recevabilité et la traçabilité déclarative.
- `AGENTS.domain.md` gouverne la règle métier ; ici on gouverne ce qui peut être affirmé, conservé ou exposé honnêtement.

---

## In scope
- minimisation et finalité des données
- rétention et cycle de vie
- sorties IA et explicabilité réglementaire
- reporting AGEC et claims de conformité
- documentation des traitements significatifs
- loyauté des allégations produit
- traçabilité utile à l’audit

## Hors scope
- sécurité technique détaillée
- implémentation backend pure sans implication réglementaire
- design UI hors wording et exposition d’information sensible
- exploitation infra et procédures d’entreprise hors produit

---

## Patterns recommandés
- wording prudent et vérifiable
- sortie “estimée”, “pré-remplie” ou “assistée” quand c’est le vrai niveau
- minimisation explicite des données
- rétention pensée dès la conception
- documentation des hypothèses et limites
- preuve reliée à la source et au calcul

---

## Anti-patterns
- claim de conformité sans preuve exploitable
- conservation indéfinie par défaut
- collecte opportuniste “pour plus tard”
- score IA opaque présenté comme certitude
- confusion entre aide au reporting et certification réelle
- wording marketing déconnecté du produit réel
- limitation connue cachée dans l’implémentation

---

## Checklist de fin
- la donnée collectée a une utilité identifiable
- la rétention ou suppression a été pensée si pertinent
- les sorties IA restent honnêtes sur leurs limites
- les claims réglementaires sont supportés par des preuves ou formulés prudemment
- aucune conformité n’est simulée dans le wording
- les hypothèses sensibles sont documentées si elles structurent le flux
- le produit reste traçable sur les calculs et reportings critiques
