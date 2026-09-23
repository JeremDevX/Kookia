**KookIA**

**L'IA au service de la restauration**

*« Ne jetez plus votre marge à la poubelle. »*

&nbsp;

**DOSSIER TECHNIQUE COMMUN**

**Jalon 1 — M1**

&nbsp;

| Élément | Contenu |
| :---- | :---- |
| Projet | KookIA — Assistant d’achat intelligent anti-gaspillage pour restaurateurs indépendants |
| École | My Digital School — Grenoble |
| Périmètre du rendu | DAD / Dev / UX-UI / Market \+ business model \+ gestion projet \+ tests utilisateurs |
| Prototype Figma | figma.com/design/lToPfTeO2mjCFMXVTEbx30 |
| Prototype web | food-ai-gray.vercel.app |
| Date du dossier | Avril 2026 |

&nbsp;

| Membre | Spécialité | Rôle principal dans le dossier |
| :---- | :---- | :---- |
| Camille Morin Marty | Market / Marketing digital | Étude de marché, positionnement, proposition de valeur, business model, messages clés |
| Benoît Bourgeois | Direction Artistique Digitale | Identité de marque, moodboard, charte graphique, big idea, storytelling visuel |
| Raneem Bach | UX/UI | UX research, benchmark UX, personas, parcours, zoning, prototype et tests utilisateurs |
| Jérémie Lavergnat | Développement Full Stack | Périmètre technique, architecture, stack, infrastructure, tests, backlog et roadmap technique |

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

# 

# **Sommaire**

1\. [Synthèse exécutive](#1.-synthèse-exécutive)

2\. [Problème, besoin et éléments d’arbitrage](#2.-problème,-besoin-et-éléments-d’arbitrage)

3\. [Market — marché, cibles, positionnement et business model](#3.-market-—-marché,-cibles,-positionnement-et-business-model)

4\. [Direction Artistique Digitale — identité, big idea et règles d’usage](#4.-direction-artistique-digitale-—-identité,-big-idea-et-règles-d’usage)

5\. [UX/UI — recherche utilisateur, parcours, prototype et tests](#5.-ux/ui-—-recherche-utilisateur,-parcours,-prototype-et-tests)

6\. [Développement Full Stack — périmètre, architecture, stack, tests et roadmap](#6.-développement-full-stack-—-périmètre,-architecture,-stack,-tests-et-roadmap)

7\. [Business model, prévisionnel et viabilité économique](#7.-business-model,-prévisionnel-et-viabilité-économique)

8\. [Gestion projet — organisation, planning, dépendances et risques](#8.-gestion-projet-—-organisation,-planning,-dépendances-et-risques)

9\. [Tests utilisateurs — synthèse transversale et décisions prises](#9.-tests-utilisateurs-—-synthèse-transversale-et-décisions-prises)

&nbsp;10\.[Conclusion](#10.-conclusion)

11\. [Annexes](#11.-annexes)&nbsp;

&nbsp;

### **1\. Synthèse exécutive** {#1.-synthèse-exécutive}

KookIA est un assistant d’achat intelligent destiné aux restaurateurs indépendants. Le projet répond à une douleur terrain identifiée : la perte financière liée au gaspillage alimentaire et au sur-stockage, la «double peine». Le restaurateur paie des marchandises qui ne seront pas vendues, puis supporte le coût et la contrainte de gestion des déchets correspondants.

Le produit ne se positionne pas comme un ERP complet ni comme une IA qui remplace le chef. Le pivot majeur du Jalon 1 consiste à 	 Ce pivot est cohérent avec les retours terrain qui expriment à la fois une demande d’outils simples, un rejet de la boîte noire et une exigence de contrôle humain.

&nbsp;

| Axe évalué | État Jalon 1 | Preuve / justification |
| :---- | :---- | :---- |
| Besoin réel | Validé qualitativement | 3 entretiens terrain : Bouillon Grenette, Le Comptoir, Pain & Cie ; verbatims sur pertes, temps, contrôle et données. |
| Cible | Claire | Restaurants indépendants de 50 à 300 couverts/jour, produits frais, maturité digitale hétérogène. |
| Solution | Prototypée | Prototype web Vercel \+ prototype Figma ; parcours cockpit, stocks, prédictions, analytics, settings. |
| Différenciation | Argumentée | Double mode API \+ OCR ; aide à la décision validée par le chef ; simplicité radicale. |
| Business model | Structuré | Abonnement 149 €/mois HT \+ installation 600 € HT ; FISY Starter et BMC disponibles. |
| Faisabilité technique | Défendable | React / TypeScript / Vite / Vercel en place ; architecture cible Node/Express/PostgreSQL documentée. |
| Risques | Identifiés | Dépendance API POS, résistance culturelle, besoin data, concurrence POS, preuves Green Claims. |

### **2\. Problème, besoin et éléments d’arbitrage** {#2.-problème,-besoin-et-éléments-d’arbitrage}

## **2.1 Contexte**

Le projet part d’un constat métier : les restaurateurs indépendants commandent souvent à l’expérience, à l’œil ou sur des moyennes empiriques. Cette pratique est défendable dans le feu opérationnel, mais elle laisse peu de place à une mesure fine des pertes, des stocks dormants et des ruptures. Les sources projet relient directement cette difficulté à trois pressions : inflation alimentaire, réglementation anti-gaspillage et maturité croissante des outils de caisse et d’IA.

| Problème terrain | Conséquence métier | Conséquence produit |
| :---- | :---- | :---- |
| Commandes à l’œil ou sur moyennes | Sur-stockage, ruptures ou ajustements tardifs | Besoin d’un assistant de prévision quotidien |
| Temps administratif faible | Pas de saisie manuelle réaliste en fin de service | Ingestion sans friction : API ou photo Ticket Z |
| Crainte de la boîte noire IA | Refus d’une commande automatique non maîtrisée | Validation humaine systématique |
| Gaspillage vécu comme perte financière | Priorité économique avant argument écologique | Dashboard orienté économies, marge et alertes |

## **2.2 Preuves terrain disponibles**

La validation Jalon 1 repose sur trois entretiens qualitatifs et des tests d’utilisabilité associés. L’échantillon reste restreint, mais cohérent avec une phase de validation exploratoire : il permet d’identifier des tendances fortes, pas de prouver statistiquement le marché.

| Établissement | Profil | Volume / contexte | Usage tech actuel |
| :---- | :---- | :---- | :---- |
| Bouillon Grenette | Brasserie traditionnelle | Environ 250 couverts/jour | Gestion au feeling / outils existants |
| Le Comptoir | Bistrot de quartier | 60 à 80 couverts/jour | Ticket Z quotidien, résistance forte |
| Pain & Cie | Boulangerie-restaurant | 50 à 200 couverts/jour selon période | Modèle hybride, usage logiciel existant |
| **Verbatim / signal terrain** | **Lecture projet** | **Impact sur la décision** |  |
| « Mon tableau de bord je l’ai compris en 3 secondes. » | L’interface doit être immédiatement lisible. | Conserver une hiérarchie visuelle radicale. |  |
| « On n’a plus le temps de rester dans les bureaux. » | Le temps administratif est proche de zéro. | Parcours quotidien très court : photo le soir, synthèse le matin. |  |
| « Si le ticket Z est la clé pour réduire ma facture fournisseur de 10 %, je serais prêt à la prendre en photo tous les soirs. » | La donnée est partageable si le gain est clair. | Conserver le mode OCR comme alternative universelle. |  |
| « Je sais pas si c’est le genre de chose qui pourrait nous correspondre parce qu’en soit c’est mon travail. » | La décision d’achat reste un geste métier. | Abandonner l’automatisation complète, placer la validation chef au centre. |  |

## **2.3 Pivot produit validé**

| Avant pivot | Problème détecté | Après pivot |
| :---- | :---- | :---- |
| « L’IA commande automatiquement pour vous. » | Rejet par peur de perdre le contrôle ; risque de boîte noire. | « L’IA apprend de vos données, recommande, et le chef valide.» |

&nbsp;

Ce pivot n’est pas cosmétique : il modifie le produit, l’UX, le discours de marque, l’architecture technique et le business model. L’UX impose un bouton de validation visible \- la DA abandonne l’imaginaire d’une IA intrusive pour celui d’un assistant silencieux \- le marketing vend une sérénité financière \- le dev prépare une architecture qui conserve la traçabilité des recommandations.

### **3\. Market — marché, cibles, positionnement et business model** {#3.-market-—-marché,-cibles,-positionnement-et-business-model}

## **3.1 Édito Market**

Le rôle Market est de transformer un problème vécu sur le terrain en opportunité structurée : taille de marché, cible prioritaire, positionnement, proposition de valeur, canaux, modèle économique et risques. L’enjeu n’est pas de présenter KookIA comme une « IA de plus », mais comme un outil métier qui parle le langage des restaurateurs indépendants.

## **3.2 Analyse environnementale PESTEL**

&nbsp;

| Facteur | Constat utilisé dans le cadrage | Impact pour KookIA |
| :---- | :---- | :---- |
| Politique | Soutien à la transition écologique et à la digitalisation des TPE/PME. | Opportunités d’aides et de discours institutionnel. |
| Économique | Pression sur les marges et coût matière ; le gaspillage est traité comme douleur financière prioritaire. | La valeur doit être exprimée en euros économisés, pas seulement en kg évités. |
| Socioculturel | Résistance aux ERP complexes ; besoin de simplicité et de contrôle. | Positionnement zéro friction, vocabulaire métier, validation chef. |
| Technologique | Maturité des API de caisses et de l’OCR / IA prédictive. | Architecture hybride API \+ OCR envisageable. |
| Environnemental | Le gaspillage alimentaire est un enjeu mesurable et communicable. | Reporting anti-gaspi et preuves d’impact deviennent des fonctionnalités. |
| Légal | Objectif français de réduction du gaspillage alimentaire de 50% pour la restauration commerciale à horizon 2030\. | La conformité / preuve AGEC devient un argument, mais doit être sourcée et encadrée. |

## **3.3 Marché et segmentation**

Le marché retenu dans les sources projet est celui de la restauration indépendante, avec un cœur de cible situé entre 50 et 300 couverts/jour. Cette plage est cohérente avec le problème identifié : volume suffisant pour que l’erreur de commande coûte cher, mais structure souvent trop petite pour supporter un ERP lourd ou une équipe data.

| Indicateur | Valeur de cadrage | Statut de preuve |
| :---- | :---- | :---- |
| Secteur restauration et services de restauration mobile | 171 356 entreprises en 2021 selon INSEE, secteur 561 | Source externe officielle |
| Cœur de cible projet | 117 000 restaurants indépendants traditionnels | Hypothèse interne |
| Maturité digitale du cœur de cible | 10 à 15 % automatisés ; moins de 5 % avec IA intégrée | Hypothèse interne |
| Cible prioritaire | Brasseries / bistrots traditionnels, 100–200 couverts, produits frais | Déduite de l’étude terrain et du potentiel volume \+ douleur |

&nbsp;

## **3.4 Personas Market**

| Persona | Profil | Douleur principale | Déclencheur d’achat |
| :---- | :---- | :---- | :---- |
| Julien — Chef artisan | Restaurant gastronomique, 40 couverts, produits nobles | Gaspillage noble sur produits chers : viandes maturées, poissons, produits premium | ROI démontré sur les produits à forte valeur |
| Sarah — Gérante business | Brasserie 150 couverts, caisse moderne | Stocks dormants et trésorerie bloquée | Intégration native avec les outils existants |
| Marc — Indépendant débrouille | Bistrot 60 couverts, caisse basique | Survie quotidienne, manque de temps, besoin d’argent immédiat | Photo Ticket Z \+ économies visibles |

## 

## **3.5 Analyse concurrentielle et positionnement**

Les concurrents identifiés couvrent des logiques différentes : ERP métier, outils prédictifs orientés chaînes, solutions de caisse ou logiciels de gestion. Le vide exploitable est la combinaison entre simplicité extrême, capacité prédictive et adaptation aux restaurants peu digitalisés.

| Solution | Facilité | Puissance IA | Adaptation restauration traditionnelle | Lecture stratégique |
| :---- | :---- | :---- | :---- | :---- |
| KookIA | Très forte | Forte (objectif) | Très forte | Positionnement hybride API \+ OCR, aide à la décision. |
| FullSoon | Moyenne à forte | Forte | Plus faible | Outil puissant mais moins adapté aux indépendants traditionnels. |
| Tenzo | Moyenne à forte | Forte | Moyenne | Solution analytique/prédictive plus orientée données structurées. |
| Koust / Easilys | Moyenne | Moyenne | Moyenne | ERP / gestion plus dense, charge cognitive plus forte. |
| Lightspeed / POS | Variable | Moyenne | Variable | Peut devenir partenaire ou concurrent si IA native. |

&nbsp;

**Triangle de positionnement**

1\. Simplicité d’usage : zéro changement d’habitude.

2\. Universalité technologique : API pour caisses modernes, OCR Ticket Z pour caisses basiques.

3\. Focus anti-gaspillage : spécialisation sur les pertes, la marge et la preuve d’impact.

&nbsp;

## **3.6 Proposition de valeur**

| Bloc | Contenu KookIA |  |
| :---- | :---- | :---- |
| WHY | Chaque restaurant indépendant mérite de vivre de sa passion sans voir sa marge finir à la poubelle. |  |
| HOW | Créer une IA prédictive qui s’adapte au restaurant, respecte le savoir-faire du chef et transforme une contrainte anti-gaspillage en opportunité de pilotage. |  |
| WHAT | Un assistant d’achat intelligent proposant des prévisions et recommandations quotidiennes à partir de l’historique de ventes, des Tickets Z, de la météo et d’événements locaux. |  |
| **Pains client** | **Pain reliever KookIA** | **Gain attendu** |
| Payer trop de marchandise puis jeter les invendus | Prévisions quotidiennes \+ recommandations d’achat | Réduction des pertes et meilleure marge |
| Pas le temps de saisir des données | Mode API ou photo Ticket Z en “30 secondes” | Adoption sans rupture métier |
| Peur de perdre le contrôle | Validation finale par le chef | Confiance et responsabilité conservées |
| Obligations anti-gaspillage difficiles à prouver | Reporting AGEC / certificat en cible produit | Preuve d’impact exploitable |

## 

## **3.7 Canaux et processus commercial**

| Étape | Action | Objectif |
| :---- | :---- | :---- |
| Prospection | Identification via partenaires POS, LinkedIn B2B, réseau CHR local | Générer des leads qualifiés |
| Qualification | Appel découverte : volume, équipement, douleur, maturité digitale | Confirmer le fit produit |
| Démonstration | Audit Double Peine sur données réelles | Prouver le ROI potentiel |
| Négociation | Présentation du pricing et des économies projetées | Signer l’abonnement |
| Onboarding | Paramétrage carte/menu, connexion API ou formation OCR, formation 1h | Activer sans friction |
| Suivi | Point mensuel, optimisation, preuves d’économies, parrainage | Fidéliser et générer du bouche-à-oreille |
| **Canal** | **Rôle** | **Statut / vigilance** |
| App stores POS | Canal indirect principal : crédibilité et acquisition qualifiée | Partenariats à signer |
| Revendeurs / installateurs locaux | Relais terrain auprès des restaurants | Commissionnement à cadrer |
| LinkedIn B2B | Prospection gérants/propriétaires Grenoble/Lyon puis national | Canal peu coûteux mais chronophage |
| Salons CHR | Démonstration et crédibilité secteur | Budget prévu à partir de l’année 2 |
| Bouche-à-oreille | Accélérateur après pilotes | Dépend de résultats mesurés |

## **3.8 Messages clés**

| Angle | Message source | Usage |
| :---- | :---- | :---- |
| Promesse principale | Ne jetez plus votre marge à la poubelle. | Signature de marque et supports commerciaux |
| ROI | Économisez 12 000 €/an pour 149 €/mois. | À utiliser uniquement après preuve ou audit réel |
| Simplicité | Une photo. Une prévision. Zéro gaspillage. | Landing page, démonstration OCR |
| AGEC | Prêts pour 2030 ? KookIA vous y emmène. | Discours conformité, à sourcer juridiquement |

&nbsp;

**Vigilance Market**

Les messages ROI et impact doivent être rattachés à des preuves chiffrées par client pilote avant usage public large. Le dossier peut les présenter comme hypothèses / promesses de cadrage, mais pas comme résultats prouvés tant que la phase bêta n’a pas mesuré les économies réelles.

### **4\. Direction Artistique Digitale — identité, big idea et règles d’usage** {#4.-direction-artistique-digitale-—-identité,-big-idea-et-règles-d’usage}

## **4.1 Édito DAD**

La direction artistique de KookIA n’a pas pour objectif de rendre l’IA spectaculaire. Elle doit rendre la technologie rassurante, lisible et immédiatement crédible pour un restaurateur qui n’a ni le temps ni l’envie d’apprendre un outil complexe. La DA sert donc la même promesse que le produit : vigilance, contrôle, rentabilité et sérénité.

&nbsp;

## **4.2 Brief créatif**

| Élément | Définition KookIA |
| :---- | :---- |
| Cible | Restaurateurs indépendants, chefs-gérants, brasseries, bistrots et restaurants sensibles à la marge et au contrôle. |
| Promesse | Changer les historiques de vente en marge nette grâce à un approvisionnement intelligent. |
| Preuve | Mode API ou OCR, recommandations quotidiennes, reporting anti-gaspillage, validation du chef. |
| Contrainte | Ne pas adopter les codes froids ou trop tech de l’ERP ni ceux d’une IA intrusive. |
| Intention | Exprimer une technologie silencieuse, fiable, qui veille pendant que le chef se concentre sur son métier. |

&nbsp;

## **4.3 Processus créatif**

| Phase | Travail réalisé | Lien avec le projet |
| :---- | :---- | :---- |
| Immersion | Analyse du PESTEL, du problème de double peine et des verbatims terrain | Le design part de la douleur économique, pas d’un style décoratif. |
| Idéation | Transformation de la contrainte AGEC en idée de sérénité financière | L’identité accompagne le passage de la perte subie au pilotage maîtrisé. |
| Prototypage & validation | MVP interactif testé auprès de 3 établissements | La simplicité visuelle est testée sur cible réelle. |
| Ajustement & pivot | Abandon de l’automatisation intrusive au profit d’un assistant silencieux | La DA porte la confiance et non la délégation aveugle. |

## **4.4 Pistes créatives explorées**

| Piste | Décision | Motif |
| :---- | :---- | :---- |
| Écologie militante | Écartée | Le terrain montre que l’écologie est secondaire face à la survie économique. |
| Haute technologie intrusive | Écartée | Les chefs rejettent la boîte noire et la perte de contrôle. |
| Assistant silencieux | Retenue | La technologie respecte le geste métier et s’adapte au restaurant. |

## 

## **4.5 Big Idea : Le Regard serein**

La Big Idea retenue est « Le Regard serein ». KookIA veille sur les stocks, les flux et les risques pour que le chef puisse fermer les yeux sereinement. Le concept associe un logo fondé sur le regard, un bleu nuit rassurant et un vert électrique orienté performance. Il traduit la promesse : une veille 24/7, mais toujours au service du contrôle humain.

&nbsp;

## **4.6 Identité visuelle**

| Élément | Choix | Justification métier |
| :---- | :---- | :---- |
| Logo | Regard / deux yeux | Symbolise la veille continue sur stocks et flux de marchandises. |
| Bleu nuit \#1B263B | Couleur principale | Sérénité, fiabilité, outil autonome qui travaille quand le chef dort. |
| Vert électrique \#00C796 | Couleur d’accent | Performance, rentabilité, rapidité d’exécution et signal positif. |
| Gris perle \#F3F4F6 | Couleur de lisibilité | Contraste calme pour lecture rapide sur écran terrain. |
| Typographie ITC Avant Garde Gothic Pro | Bold / Demi / Medium | Hiérarchie claire, angles humains, extrémités stables. |

&nbsp;

![][image1]

*Extrait charte — logotype, regard, version minimale et zone de protection.*

&nbsp;

![][image2]

*Extrait charte — palette : bleu nuit, gris perle, vert électrique.*

&nbsp;

![][image3]

*Moodboard*

## **4.7 Règles d’usage et interdits**

| Règle | Raison |
| :---- | :---- |
| Ne pas modifier la typographie du logo. | Préserver la reconnaissance de marque. |
| Ne pas déformer, pivoter ou supprimer une partie du logo. | Maintenir la stabilité et la crédibilité visuelle. |
| Ne pas modifier la teinte ou l’opacité. | Conserver la cohérence des codes vigilance / performance. |
| Ne pas changer la couleur intérieure des yeux indépendamment du fond. | Préserver le sens de veille invisible et la lisibilité. |

## **4.8 Storytelling visuel**

Le récit de marque suit une structure simple. Le constat est l’absurdité de la double peine : le restaurateur jette sa marge. Le héros est le restaurateur oublié de la tech. KookIA joue le rôle de mentor discret, non intrusif. La résolution est la vigilance sereine : l’outil veille, le chef décide, la marge est protégée.

| Support | Déclinaison recommandée selon les sources |
| :---- | :---- |
| LinkedIn / Ads | Fond bleu nuit, chiffres ROI en vert électrique, logo regard en rappel de veille 24/7. |
| Stands / salons | Signalétique lisible de loin, angles arrondis, accroche centrée sur la marge. |
| Stickers Audit Double Peine | Support print minimaliste, vert électrique comme code de réussite. |
| Guides d’installation | Design épuré pour refléter la simplicité radicale et réduire la barrière technologique. |
| App stores POS | Icône minimale : yeux sur fond bleu nuit, lecture immédiate comme plugin expert. |

### **5\. UX/UI — recherche utilisateur, parcours, prototype et tests** {#5.-ux/ui-—-recherche-utilisateur,-parcours,-prototype-et-tests}

## **5.1 Édito UX/UI**

L’UX/UI de KookIA répond  à une exigence forte : un restaurateur pressé doit comprendre la valeur de l’outil en quelques secondes. Le design d’expérience n’est donc pas centré sur la richesse fonctionnelle maximale, mais sur la réduction de la charge cognitive, la transparence de l’IA et la validation humaine.

## **5.2 Périmètre livré au Jalon 1**

| Attendu UX/UI | Livrable | Statut |
| :---- | :---- | :---- |
| Recherche utilisateur & interviews | 3 entretiens qualitatifs terrain | Livré |
| Benchmark UX concurrentiel | Analyse UX des solutions existantes | Livré |
| Personas & user stories | 3 personas | Livré |
| Zoning | Zoning des écrans principaux | Livré |
| Wireframes & prototype | Prototype web / vibe coding \+ Figma landing page | Livré |
| Tests d’utilisabilité | Protocole cadré \+ tests Think Aloud | Livré |

## 

## **5.3 Méthodologie de la recherche utilisateur**

Un guide d’entretien semi-directif a été conçu afin d’explorer les pratiques de gestion des stocks, les contraintes opérationnelles et la perception du gaspillage chez les restaurateurs.

Cette première phase exploratoire repose sur un échantillon restreint (3 entretiens), suffisant pour identifier des tendances fortes mais nécessitant une validation à plus grande échelle en phase suivante.

Cette phase vise  à la fois à faire émerger des insights utilisateurs et à tester plusieurs hypothèses, notamment autour de la gestion des pertes et de la faisabilité d’une solution basée sur l’exploitation du Ticket Z.

&nbsp;

&nbsp;

&nbsp;

| Thématique | Verbatim brut&nbsp; | Analyse / insight UX | Impact décisionnel |
| :---- | :---- | :---- | :---- |
| Rapport à l’IA | *"Je ne sais pas si c’est pour nous parce qu’en soit \[commander\] c’est mon travail."* | **Peur de la dépossession.** L’automatisation est perçue comme une menace pour l’expertise métier du chef. | **Pivot produit :** abandon du mode “Auto” au profit d’un mode “Suggérer / Valider”. |
| Charge cognitive | *"On n'a plus le temps de rester dans les bureaux, on est en flux tendu."* | **Saturation mentale.** Toute interface nécessitant plus de quelques secondes de réflexion risque d’être rejetée en contexte de service. | **Zoning interface :** dashboard épuré avec priorité absolue aux alertes critiques. |
| Valeur perçue | *"L’écologie c’est bien, mais à la fin du mois c’est ma marge qui compte."* | **Primauté économique.** Les enjeux écologiques sont secondaires face à la rentabilité. | **Copywriting :** mise en avant du ROI (euros économisés) avant les indicateurs environnementaux. |
| Saisie de données | *"Si je dois taper chaque tomate sur un écran en fin de service, je ne le ferai jamais."* | **Rejet de la saisie manuelle.** Les interactions clavier sont incompatibles avec les contraintes terrain. | **Choix technique :** priorité donnée à la capture automatisée (scan / OCR ticket) pour réduire le temps de saisie à environ 30 secondes. |

## **5.4 Protocole de test utilisateur**

Afin de confronter l’interface aux usages réels, chaque entretien a été complété par un test d’utilisabilité reposant sur la méthode Think Aloud (verbalisation à voix haute). Les participants ont été placés devant un [prototype web interactif](https://food-ai-gray.vercel.app/) et ont dû accomplir trois tâches clés sans aide.

&nbsp;

**Tâche 1 \- Gestion des urgences (stocks).**

Consigne : « Imaginons que vous arrivez le matin, vous ouvrez l’application, vous voyez qu’il y a des ruptures prévues. Montrez-moi comment vous faites pour régler le problème des tomates et de la viande hachée. »&nbsp;

Objectif : évaluer l’efficacité du tableau de bord ainsi que la compréhension des actions prioritaires.

**Tâche 2 \- Optimisation des invendus (anti-gaspillage).**

Consigne : « Disons qu’il vous reste trop de stock sur un produit et vous voulez éviter de le jeter. Comment utilisez-vous l’outil pour trouver une idée pour l’écouler ? »&nbsp;

Objectif : mesurer l’intuitivité de l’onglet Recettes et la pertinence des suggestions proposées.

**Tâche 3 \- Conformité réglementaire (reporting).**

Consigne : « L’inspecteur de l’hygiène ou votre comptable vous demande votre bilan pour la loi anti-gaspillage, où allez-vous pour sortir le document ? »&nbsp;

Objectif : vérifier l’accessibilité de la section Analytics.

&nbsp;

## **5.5 Résultats UX observés**

L’analyse des tests (cf : annexe 3\)  met en évidence des comportements variés selon le niveau de familiarité numérique, mais une perception globalement positive de la valeur de l’outil.

* L’accessibilité ressort comme un facteur clé d’adoption. Pour les profils les moins à l’aise avec le numérique, la lisibilité du tableau de bord a été déterminante. Une compréhension rapide de l’interface permet de transformer une réticence initiale en intérêt.  
* La confiance envers l'IA est ressortie comme un point de vigilance majeur. Le concept de commande automatique a été perçu comme un gain de temps potentiel, mais les utilisateurs expérimentés ont exprimé un besoin de validation intermédiaire pour conserver le contrôle, notamment vis-à-vis des relations fournisseurs. Ce retour a directement motivé l'abandon du mode automatique au profit du modèle Suggérer / Valider.  
* Le rapport AGEC apparaît comme une fonctionnalité rassurante. L’automatisation de cette tâche administrative complexe constitue un avantage perçu, mais elle ne remplace pas la promesse principale centrée sur les économies et le pilotage quotidien.  
* Le langage métier est déterminant. Les termes comme fiches recettes, marges brutes, coefficients, couverts ou Ticket Z permettent à l’outil d’être perçu comme un assistant métier plutôt que comme un logiciel technique.

### **5.5.1 Métriques d’utilisabilité (Synthèse des tests)**

Afin d’évaluer l’efficacité réelle de l’interface, trois indicateurs clés ont été mesurés : le **taux de succès** (capacité à réaliser correctement une tâche), le **temps moyen d’exécution** (efficience) et le **niveau d’erreurs ou de blocages** (frictions rencontrées).

| Tâche testée | Taux de réussite | Temps moyen | Erreurs / Blocages |
| :---- | :---- | :---- | :---- |
| T1 : Identifier et traiter une rupture (Dashboard)&nbsp; | **100%** | **8 sec.** | Aucune erreur. La hiérarchie visuelle (code couleur rouge / urgence) est immédiatement comprise. |
| T2 : Trouver une solution pour un sur-stock (Recettes) | **66%** | **22 sec.** | **Point de friction :** 1 utilisateur sur 3 a consulté d’abord la section “Stocks” avant d’identifier l’onglet “Recettes”. |
| T3 : Sortir le bilan AGEC (Analytics)&nbsp; | **100%** | **12 sec.** | **Léger blocage :** hésitation initiale sur le terme “Analytics”, mais la fonctionnalité est ensuite identifiée sans assistance. |

&nbsp;

Analyse des erreurs et points de vigilance

* **Absence de blocage critique :** l’ensemble des testeurs est parvenu à réaliser les tâches sans assistance externe.  
* **Courbe d’apprentissage :** pour le profil le moins technophile, un temps d’adaptation d’environ **4 secondes** est observé à l’ouverture de l’interface, lié à un effet de surcharge visuelle initiale. La navigation devient fluide après compréhension du vocabulaire métier.  
* **Efficience globale :** l’objectif de compréhension rapide de la situation est globalement validé. Le temps de consultation du dashboard se situe entre **5 et 10 secondes** pour les utilisateurs expérimentés, confirmant une bonne efficacité de lecture de l’information.

Les entretiens ont conduit à un pivot fonctionnel majeur : abandon du modèle plugin automatique qui commande seul au profit d'un modèle "aide à la décision où l'IA suggère et le chef valide". Ce pivot a directement impacté la conception : le bouton de validation chef devient un élément de design toujours visible et jamais automatisé.

## **5.6 Benchmark UX**

Au-delà de l'analyse stratégique des concurrents, une analyse UX des interfaces existantes a été réalisée à partir de trois outils représentatifs (cf. annexe 5).

* Tenzo privilégie la compréhension des données et le reporting analytique, au prix d'une charge cognitive élevée : l'interface suppose une maturité digitale que la majorité des restaurateurs indépendants ne possède pas.&nbsp;  
* Lightspeed optimise la rapidité d'exécution en contexte de service, mais sa profondeur fonctionnelle reste limitée dès qu'il s'agit d'analyser les stocks ou d'anticiper les besoins d'achat.&nbsp;  
* FullSoon est l'outil le plus proche de KookIA dans sa logique prédictive, mais son interface reste moins adaptée aux établissements peu digitalisés, notamment ceux ne disposant pas d'une caisse connectée.

Ces observations ont orienté trois choix de conception : réduire le nombre d'écrans au strict nécessaire, concentrer les alertes critiques en zone haute du dashboard, et centraliser la validation chef sur un bouton unique toujours visible.

&nbsp;

&nbsp;**5.7 Personas cibles**

L’étude terrain a été menée auprès de plusieurs établissements de restauration aux profils variés (brasserie, bistrot, restaurant gastronomique), se distinguant par leur volume d’activité, leur organisation interne et leur niveau de maturité technologique.

L’analyse des entretiens a permis de faire émerger plusieurs tensions récurrentes :

* une pression opérationnelle forte, particulièrement en période de service  
* une gestion des stocks perçue comme chronophage et mentalement coûteuse  
* une relation ambivalente aux outils numériques, oscillant entre nécessité et rejet

Ces enseignements ont conduit à la formalisation de trois personas représentatifs (cf. annexe 4), construits autour de logiques d’usage différenciées plutôt que de critères sociodémographiques.

### **5.7.1 Synthèse des profils UX**

Malgré des contextes d’activité différents, les trois profils présentent un besoin commun : réduire la charge cognitive. L’attente centrale exprimée est l’accès rapide à une information claire, fiable et directement actionnable.

L’analyse des entretiens utilisateurs met en évidence trois logiques d’usage distinctes :

* **Profil expert (Chef artisan)** : recherche de précision, de contrôle et de fiabilité. Besoin de données synthétiques, structurées et immédiatement interprétables.  
* **Profil gestionnaire (Gérante business)** : orientation performance et rentabilité. Besoin de pilotage en temps réel et de détection rapide des anomalies.  
* **Profil opérationnel (Chef-gérant débrouille)** : priorité à la simplicité et au gain de temps. Besoin d’interactions minimales et d’un guidage explicite.

### **5.7.2 Insight UX clé**

L'analyse croisée des profils révèle un constat structurant : les utilisateurs ne manquent pas de données, mais de clarté et de capacité d’action.

Autrement dit, un excès d’information génère de la confusion, tandis qu’un manque de guidance peut conduire à l’inaction.

### **5.7.3 Implications pour la conception**

Ces résultats impliquent la conception d’une interface capable de :

* réduire la complexité perçue, quel que soit le niveau d’expertise  
* adapter la densité d’information au contexte d’usage  
* proposer des interactions rapides et à faible charge cognitive  
* transformer les données en actions concrètes et immédiatement compréhensibles

## **5.8 Architecture d’information du MVP**

&nbsp;

| Module | Objectif utilisateur | Contenu clé | Profondeur |
| :---- | :---- | :---- | :---- |
| Dashboard / Cockpit | Scanner la situation en moins de 30 secondes | KPI du jour, alertes prioritaires, économies réalisées | 1 niveau |
| Stocks | Identifier ruptures et sur-stocks | Liste produits, seuils, indicateurs couleur | 2 niveaux |
| Predictions | Valider les recommandations IA | Prévisions couverts, besoins d’achat, bouton validation chef | 2 niveaux |
| Recipes | Écouler les invendus | Suggestions contextualisées à partir des stocks | 2 niveaux |
| Analytics | Mesurer l’impact anti-gaspillage | Ratio matière, économies, reporting AGEC | 2 niveaux |
| Settings | Configurer l’outil | Seuils, connexions, préférences notifications | 2 niveaux |

## 

## **5.9 Zoning des écrans clés** (cf. annexe 6\)

| Écran | Zone haute | Zone centrale | Zone basse / action |
| :---- | :---- | :---- | :---- |
| Dashboard | KPI critiques rouge / orange | Graphique tendance \+ économies réalisées | Accès rapide aux alertes urgentes |
| Predictions | Prévision couverts \+ confiance IA | Recommandations d’achat | Bouton Valider pleine largeur \+ Modifier |
| Stocks | Filtres critique / attention / OK | Liste produits avec barre de niveau couleur | Ajout entrée de stock |
| Analytics | Indicateurs de pertes / économies | Évolution des ratios et rapport | Export / reporting AGEC |

### **6\. Développement Full Stack — périmètre, architecture, stack, tests et roadmap** {#6.-développement-full-stack-—-périmètre,-architecture,-stack,-tests-et-roadmap}

## **6.1 Édito Dev**

La contribution développement vise à prouver que la solution est techniquement faisable sans surdimensionner le Jalon 1\. Le prototype actuel est assumé comme un MVP frontend interactif sur données simulées. Le choix est cohérent avec l’objectif d’arbitrage du Jalon 1 : tester le parcours, la promesse, la compréhension et la crédibilité avant d’investir dans une architecture complète de production.

## **6.2 Périmètre technique Jalon 1**

| Axe | Constat actuel | Lecture Jalon 1 |
| :---- | :---- | :---- |
| Prototype | Front interactif avec Dashboard, Stocks, Predictions, Recipes, Analytics et Settings | Suffisant pour démontrer un parcours métier et la promesse produit |
| Données | Mocks locaux, absence de persistance serveur active | Prototype de démonstration, pas produit de production |
| Architecture runtime | Pages → hooks → services → mockData | Socle lisible pour migration progressive |
| Qualité | Scripts lint / build / test ; CI GitHub Actions ; Vitest configuré | Point fort technique pour soutenance |
| Déploiement | Front déployable sur Vercel avec rewrite SPA | Prototype réellement exécutable |
| Backend / persistance | API REST, base de données, ingestion POS / OCR non implémentées | Hors scope Jalon 1 mais architecture cible documentée |

## **6.3 Exigences techniques dérivées du besoin**

| Exigence | Description | Niveau |
| :---- | :---- | :---- |
| Simplicité | L’outil doit être compris rapidement sans rupture métier. | Critique |
| Universalité | Absorber API POS ou OCR Ticket Z selon maturité digitale. | Critique |
| Lisibilité | Recommandations explicables et validables. | Critique |
| Scalabilité | Migrer vers un fullstack sans réécrire le front. | Important |
| Testabilité | Isoler règles métier dans des services testables. | Important |
| Traçabilité | Documenter scénarios de tests et pipeline qualité. | Important |

&nbsp;

## **6.4 Architecture actuelle**

| Couche | Responsabilité | État |
| :---- | :---- | :---- |
| pages | Assemblage des écrans métier et navigation | En place |
| hooks | Orchestration des flux de données et logique UI | En place |
| services | Règles métier, accès aux données, simulation latences | En place |
| types | Typage du domaine et contrats internes | En place |
| mockData | Données de démonstration | Temporaire |
| API client | Consommation future backend réel | À mettre en place |

**Schéma logique actuel**

Pages métier → Hooks d’orchestration → Services domaine → MockData

Cette séparation limite le couplage entre UI et source de données. La migration future remplace les mocks par des adapters HTTP sans réécrire les pages.

## **6.5 Architecture cible fullstack**

| Brique | Choix cible | Rôle |
| :---- | :---- | :---- |
| Frontend | React 19 \+ TypeScript 5.9 \+ Vite 7 | Interface riche, typée, migrable depuis le prototype |
| Backend | Node.js / Express \+ TypeScript | API REST produits, stocks, prévisions, analytics, settings |
| Base de données | PostgreSQL | Persistance métier et historique d’exploitation |
| IA / OCR | Service dédié ou module spécialisé | Extraction Ticket Z, prédictions, recommandations |
| Intégrations externes | APIs POS, météo, événements locaux, HACCP en cible | Affiner les prévisions et la preuve réglementaire |

## **6.6 Stack Jalon 1 et justification**

| Brique | Choix retenu | Justification |
| :---- | :---- | :---- |
| UI | React 19 | Composabilité et industrialisation d’un prototype riche. |
| Langage | TypeScript 5.9 | Contrats de données plus robustes et préparation fullstack. |
| Build | Vite 7 | Feedback court et intégration React simple. |
| Routing | React Router 7 | Navigation SPA lisible pour écrans métier. |
| Data visualisation | Recharts | KPI analytiques lisibles pour MVP. |
| Qualité | ESLint 9 \+ Vitest 4 | Pipeline léger mais pertinent. |
| CI | GitHub Actions | Contrôles automatisés lint / build / test. |
| Hébergement | Vercel | Déploiement front simple et previews. |

## **6.7 Infrastructure de déploiement**

| Environnement | Choix défendu | Commentaire |
| :---- | :---- | :---- |
| Développement | Local npm \+ Vite | Boucle de feedback rapide. |
| Intégration continue | GitHub Actions Node 20 | Qualité automatisée sur push / pull request. |
| Préproduction front | Vercel | Prototype démontrable en soutenance. |
| Production cible | Front CDN \+ API Node \+ PostgreSQL | Architecture recommandée pour M2, non implémentée au Jalon 1\. |

## **6.8 Stratégie de tests**

| Niveau | Objet | Statut Jalon 1 |  |
| :---- | :---- | :---- | :---- |
| Unitaires | Services métier, calculs, utilitaires, priorisation | Partiellement en place |  |
| Intégration front | Hooks \+ services \+ mapping données | À renforcer en M2 |  |
| Système / parcours | Navigation, écrans clés, cohérence de flux | Recette manuelle |  |
| Utilisateur | Compréhension du prototype et de la promesse | Mené côté UX / terrain |  |
| **ID** | **Scénario** | **Type** | **Résultat attendu** |
| T01 | Chargement dashboard | Système | Indicateurs principaux sans erreur |
| T02 | Consultation stocks | Système | Liste produits et états lisibles |
| T03 | Affichage prédictions | Système | Prévisions rendues avec priorité |
| T04 | Navigation entre écrans | Système | Pas d’écran blanc ni rupture |
| T05 | Calcul indicateur analytique | Unitaire | Valeur attendue |
| T06 | Règle stock critique | Unitaire | Seuil bas correctement signalé |
| T07 | Données vides | Intégration | État vide géré sans crash |
| T08 | Migration adapter API | Intégration | Contrat UI conservé |
| T09 | Compréhension écran cible | Utilisateur | Valeur identifiée en quelques secondes |
| T10 | Démo soutenance | Recette | Parcours sans blocage |

## **6.9 Backlog technique initial**

| Epic | User story | Priorité |
| :---- | :---- | :---- |
| E1 — Cockpit | Visualiser les KPI clés du jour pour identifier les anomalies. | Haute |
| E1 — Cockpit | Voir les alertes prioritaires dès l’ouverture. | Haute |
| E2 — Stocks | Consulter l’état du stock pour éviter sur-stockage et rupture. | Haute |
| E2 — Stocks | Distinguer les niveaux critiques pour prioriser les achats. | Haute |
| E3 — Prédictions | Consulter une prévision de besoin pour ajuster les commandes. | Haute |
| E3 — Prédictions | Garder la validation finale des recommandations IA. | Haute |
| E4 — Analytics | Suivre les indicateurs de gaspillage et de valeur. | Moyenne |
| E5 — Ingestion | Brancher une caisse via API. | Moyenne |
| E5 — Ingestion | Utiliser une photo / OCR si restaurant peu digitalisé. | Moyenne |
| E6 — Paramétrage | Configurer seuils et préférences. | Basse |

## **6.10 Risques techniques et dépendances**

| Risque | Impact | Réponse proposée |
| :---- | :---- | :---- |
| Qualité OCR Ticket Z variable | Données sales, erreurs de prédiction | Prévoir correction manuelle minimale, tests sur vrais tickets, seuil de confiance OCR. |
| Dépendance API POS | Blocage d’intégration ou changement d’accès | Diversifier POS et conserver OCR comme fallback universel. |
| Prédiction IA non explicable | Perte de confiance utilisateur | Journaliser les critères de recommandation et afficher les raisons métier. |
| Scalabilité prématurée | Surcoût et complexité | Conserver MVP simple jusqu’à validation bêta. |
| RGPD / AI Act / données commerciales sensibles | Risque juridique et confiance | Minimisation, consentement, registre traitement, chiffrement et séparation des tenants. |

&nbsp;

### **7\. Business model, prévisionnel et viabilité économique** {#7.-business-model,-prévisionnel-et-viabilité-économique}

## **7.1 Business Model Canvas argumenté**

| Bloc BMC | Contenu KookIA | Justification |
| :---- | :---- | :---- |
| Segments clients | Restaurants indépendants 50–300 couverts/jour, chefs, gérants | Douleur financière forte et besoin d’outil léger. |
| Proposition de valeur | Assistant d’achat IA, API \+ OCR, recommandations validées par le chef | Répond au besoin de marge, simplicité et contrôle. |
| Canaux | App stores POS, revendeurs, LinkedIn B2B, salons CHR, bouche-à-oreille | Mix acquisition terrain \+ distribution via outils existants. |
| Relations clients | Audit Double Peine, onboarding 1h, support prioritaire, suivi mensuel | Réduit le risque d’adoption. |
| Revenus | 149 €/mois HT \+ 600 € HT d’installation | Modèle SaaS récurrent \+ paramétrage initial. |
| Ressources clés | Algorithmes, historique de ventes, module OCR, équipe produit/market/DA/UX | Le produit dépend des données et de l’adoption. |
| Activités clés | Développement IA/OCR, intégrations POS, support, acquisition | Cœur de production et commercialisation. |
| Partenaires clés | Éditeurs POS, fournisseurs IA/cloud, données météo/événements, HACCP en cible | Données et canaux de distribution. |
| Coûts | R\&D, infrastructure SaaS, locaux, logiciels, salaires à partir de l’année 2 | Structure FISY et business plan. |

## **7.2 Pricing et logique de revenu**

| Poste | Montant | Rôle dans le modèle |
| :---- | :---- | :---- |
| Abonnement mensuel | 149 €/mois HT | Revenu récurrent, prévisible, lié à la valeur continue. |
| Frais d’installation | 600 € HT | Paramétrage carte/menu, connexion API ou formation OCR, calibrage initial. |
| Audit Double Peine | Gratuit | Offre d’appel pour prouver le ROI avant engagement. |

## **7.3 Prévisionnel FISY — synthèse**

| KPI | Année 1 | Année 2 | Année 3 | Lecture |
| :---- | :---- | :---- | :---- | :---- |
| Clients fin d’année | 22 | 58 | 118 | Croissance progressive, seuil de quasi-équilibre visé en année 3\. |
| Chiffre d’affaires | 31 370 € | 95 802 € | 187 980 € | CA récurrent \+ installation. |
| Résultat d’exploitation | 4 030 € | \-76 178 € | \-17 000 € | Année 2 pénalisée par recrutement ; année 3 quasi-équilibre. |
| Résultat net avant impôt | \-6 955 € | \-87 163 € | \-27 985 € | Modèle encore déficitaire sur le prévisionnel 3 ans. |
| ARR | 39 336 € | 103 704 € | 210 984 € | Base SaaS récurrente en croissance. |
| MRR | 3 278 € | 8 642 € | 17 582 € | Rythme mensuel cohérent avec clients actifs. |
| LTV / CAC | 17,88 | 17,88 | 17,88 | Hypothèse attractive à valider terrain. |

## **7.4 Besoins et financement**

| Poste | Année 1 | Année 2 | Année 3 |
| :---- | :---- | :---- | :---- |
| Investissement CAPEX | 32 954 € | 0 € | 0 € |
| BFR | 10 000 € | 5 000 € | 5 000 € |
| Pertes d’exploitation | 130 610 € | 76 178 € | 17 000 € |
| Total besoins | 173 564 € | 81 178 € | 22 000 € |
| Total ressources prévues | 100 000 € | 110 000 € | 50 000 € |
| Écart ressources \- besoins | \-73 564 € | \+28 822 € | \+28 000 € |
| Trésorerie cumulée | \-73 564 € | \-44 742 € | \-16 742 € |

**Lecture financière**

Le modèle montre un potentiel SaaS, mais le prévisionnel n’est pas encore totalement sécurisé. Le besoin de financement année 1 reste négatif dans le FISY. Le dossier doit donc présenter le business model comme crédible mais conditionné à l’obtention de financements, à la validation des hypothèses CAC/churn et à la transformation des pilotes en clients payants.

&nbsp;

## **7.5 Seuil de rentabilité**

| Élément | Valeur | Commentaire |
| :---- | :---- | :---- |
| Revenu annuel récurrent par client | 1 788 € | 149 € × 12 mois |
| Total coûts fixes AN3 | 204 980 € | Structure avec salaires \+ SaaS \+ locaux |
| Nombre clients break-even | 115 | Coûts fixes / revenu annuel client |
| Clients prévus AN3 | 118 | Objectif FISY |
| Marge AN3 | \-17 000 € | Quasi-équilibre, mais pas rentabilité nette pleine |

&nbsp;

### **8\. Gestion projet — organisation, planning, dépendances et risques** {#8.-gestion-projet-—-organisation,-planning,-dépendances-et-risques}

## **8.1 Organisation de l’équipe**

| Rôle | Responsable | Responsabilités |
| :---- | :---- | :---- |
| Market | Camille Morin Marty | Marché, cible, positionnement, messages, business model, go-to-market. |
| Direction artistique | Benoît Bourgeois | Moodboard, charte, logo, big idea, cohérence de marque. |
| UX/UI | Raneem Bach | Research, parcours, prototype, tests, accessibilité, design system. |
| Développement | Jérémie Lavergnat | Architecture, stack, prototype, qualité, tests, roadmap technique. |

## **8.2 Méthode projet**

La méthode suivie est une logique Lean Startup / Test & Learn : hypothèses, entretiens, prototype, test, pivot et formalisation. Le projet ne se limite pas à une intention : le pivot produit a été décidé à partir des retours utilisateurs et a impacté toutes les spécialités.

| Rituel / outil | Usage projet | Preuve / source |
| :---- | :---- | :---- |
| Entretiens terrain | Validation besoin, pains, acceptation données et freins IA | 3 établissements |
| Prototype Figma / Web | Validation promesse et parcours | Liens fournis en page de garde |
| Gantt KookIA | Planification produit / IA / UX / lancement | Fichier gantt\_kookia.xlsx |
| FISY Starter | Hypothèses de revenus, coûts, seuil rentabilité | Fichier KookIA\_FISY\_Starter |
| Backlogs UX et Dev | Priorisation fonctionnalités selon valeur et faisabilité | Docs UX/UI et Dev |

## **8.3 Planning synthétique**

| Phase | Période source | Livrables / tâches | Statut |
| :---- | :---- | :---- | :---- |
| Phase 0 — Idéation & cadrage | Q4 2025 | Étude terrain, personas, SWOT, business plan, benchmark UX, collecte Tickets Z | Fait / collecte en cours |
| Phase 1 — MVP & fondations IA | Q1–Q2 2026 | Maquettes, identité, MVP, tests terrain, dossiers financement, recrutement freelance ML | Fait / en cours / planifié |
| Data Science — tickets Z vers modèle IA | Q2 2026 à Q1 2027 | OCR, nettoyage dataset, EDA, feature engineering, modèle v1, backtesting, validation précision 80 % | Freelance planifié |
| Pivot UX — Design System & itérations | Q2–Q3 2026 | Audit UX, design system, flows API/OCR, tests itération 2 | Planifié |
| Phase 2 — Tests bêta & lancement | 2027 | Tests bêta 10 restaurants, pipeline OCR prod, intégrations API, site web, contenus, outreach | Planifié |
| Phase 3 — Croissance | 2027 | Onboarding 60 clients, campagnes marketing scale, kit UI final, module collectivités | Planifié |

## **8.4 Dépendances entre spécialités**

| Dépendance | Pourquoi elle compte | Impact si non traitée |
| :---- | :---- | :---- |
| Market → UX | Les personas et le positionnement définissent les parcours prioritaires. | Prototype désaligné avec la cible réelle. |
| UX → Dev | Les parcours, zones et interactions définissent le périmètre technique. | Développement de fonctionnalités non testables ou inutiles. |
| DA → UX/UI | La charte et les tokens visuels structurent l’interface. | Incohérence entre promesse de marque et expérience. |
| Dev → UX/Market | Les contraintes API/OCR et data imposent des limites réalistes. | Promesses commerciales non faisables. |
| Market → Business model | Le pricing et les canaux dépendent de la valeur perçue. | Modèle économique non crédible. |

## **8.5 Matrice des risques projet**

| Risque | Probabilité | Impact | Atténuation |
| :---- | :---- | :---- | :---- |
| Résistance culturelle aux outils | Élevée | Moyen | Mode photo, langage métier, démo ROI, validation chef. |
| POS développent leur propre IA | Moyenne | Élevé | Devenir plugin expert anti-gaspi, nouer partenariats tôt. |
| Dépendance API | Moyenne | Élevé | Diversifier intégrations et maintenir OCR fallback. |
| Données insuffisantes ou sales | Élevée | Élevé | Collecte Tickets Z, nettoyage, freelance ML, calibrage progressif. |
| Green Claims / preuves écologiques | Certaine | Moyen | Ne communiquer que sur preuves mesurées et auditables. |
| Financement insuffisant | Moyenne | Élevé | Subventions, prêt d’honneur, aides, bêta facturable, ajustement coûts. |

&nbsp;

### **9\. Tests utilisateurs — synthèse transversale et décisions prises** {#9.-tests-utilisateurs-—-synthèse-transversale-et-décisions-prises}

## **9.1 Objectif des tests**

Les tests ont pour objectif de vérifier que la solution répond bien à la problématique client : comprendre rapidement l’état du restaurant, identifier des actions utiles, accepter une recommandation IA et percevoir la valeur économique de KookIA sans formation lourde.

## **9.2 Profils testeurs**

| Testeur / établissement | Profil | Pourquoi ce profil est utile |
| :---- | :---- | :---- |
| Bouillon Grenette | Brasserie à fort volume | Teste la valeur sur volumes importants et gestion opérationnelle dense. |
| Le Comptoir | Bistrot de quartier | Teste la résistance technologique et la logique Ticket Z. |
| Pain & Cie | Boulangerie-restaurant hybride | Teste l’adaptation à des modèles d’activité variables. |

&nbsp;

## **9.3 Tâches testées**

| Tâche | Écran / module | Critère de réussite |
| :---- | :---- | :---- |
| Traiter une rupture prévue | Dashboard / Stocks | Identifier rapidement l’alerte et l’action prioritaire. |
| Limiter un invendu | Recipes / Stocks | Trouver une suggestion d’écoulement compréhensible. |
| Trouver un bilan anti-gaspillage | Analytics | Localiser le reporting sans aide. |

## **9.4 Résultats consolidés**

| Résultat | Problème identifié | Décision prise | Impact projet |
| :---- | :---- | :---- | :---- |
| Compréhension rapide du dashboard | Aucun blocage majeur sur lecture des KPI | Conserver cockpit simple | Renforce la promesse zéro friction. |
| Intérêt pour l’automatisation | Crainte de perdre le contrôle | Validation chef obligatoire | Pivot produit et UX. |
| Valeur du rapport AGEC | Fonction rassurante mais non déclencheur primaire | Placer AGEC en bénéfice secondaire | Alignement Market / UX. |
| Acceptation de partager données | Conditionnée à la preuve de gain | Audit Double Peine \+ démonstration ROI | Alimente process commercial. |

## **9.5 Décisions transversales issues des tests**

| Décision | Source terrain | Spécialités impactées |
| :---- | :---- | :---- |
| Ne pas vendre une IA qui commande seule | Rejet de la boîte noire / besoin de contrôle | Market, UX, Dev, DA |
| Conserver le mode OCR Ticket Z | Restaurants non équipés ou réticents aux intégrations | Dev, UX, Market |
| Mettre le ROI en premier niveau de lecture | Pain point financier prioritaire | Market, UX, DA |
| Utiliser un vocabulaire métier | Besoin de reconnaissance et de simplicité | UX, DA, Market |
| Prévoir une transparence sur les données | Acceptation conditionnelle du partage | Dev, UX, juridique |

&nbsp;

### **10\. Conclusion** {#10.-conclusion}

Ce Jalon 1 valide l'essentiel : un problème terrain réel, une cible identifiée, une solution prototypée et testée, et un pivot produit décidé à partir de preuves utilisateurs. Nous avons démontré notre capacité à travailler de manière transversale, chaque décision issue des tests a impacté simultanément le marketing, l'UX, la direction artistique et le développement.

Le pivot majeur de ce jalon, passer d'une IA qui commande à une IA qui suggère et laisse le chef valider, n'est pas un recul. C'est une décision de conception fondée sur ce que les restaurateurs nous ont dit et montré. Elle rend le produit plus crédible, plus adoptable et plus défendable commercialement.

Les bases sont posées. Ce qui reste à construire pour la suite est connu, priorisé et documenté : élargir la validation terrain, consolider le modèle financier, formaliser la conformité RGPD et transformer le prototype démonstratif en produit orienté bêta.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

# 

### **11\. Annexes**&nbsp; {#11.-annexes}

# **Annexes 1 : Business Model Canva**

&nbsp;

# **Annexes 2 : Mapping Concurrentiel![][image4]**

# **Annexes 3 : Journey map**&nbsp;

&nbsp;

**Annexes 4 : Persona**

# 

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

# **Annexes 5 : Benchmark UX**

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

# **Annexes 6  : Zoning**

&nbsp;

&nbsp;

&nbsp;

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAdsAAAEuCAIAAABJRy/JAAB5zElEQVR4XuydBXgTSRuABz2OQ4rUkiAVtC0UqAPF3d3d3eEOh8PdWtwdDrdDDy/u7l5qVFKjwM//zU662e6kbdqkpdBvnvdJZ8d2O0neTHZnJ0QdHokgCIKkBQifhCAIgvwQ0MgIgiBpBTQygiBIWgGNjCAIklZAIyMIgqQVEjFyVNTnzzFfkfRM9Ocv/AtDSnh41OfIGAT6ge8cKdCTfPci6YrIqM/8C0NKvEaOiIwmpJiyiAeCKIp4XLx8g3+RAM5X15GLXgjD7ep6vouAsxeuKrheRdInhBQHu/IvEoZuI4PI+YaQdA4hSumLJBxePZySECBc9h4jKr4zkXROfINl3UY2KeDMN4Eg4RHaL+bkympeRgjlymqxl6DH+G5EkNwFnHnx0rcVnxSFA2QkHq7fuq996fAmQmIRe+najXt8NyKIMp5hsg4jf475yldGEGDL1p3alw6nIURE7CXoMb4bEQQA0/L6RSMjSQCNrCdiL6GRkfhAIyOGgkbWE7GX0MhIfKSqkQs71nGoN8C+Tn+HusAAgf72dfvb1elXqFQtvjzyU4BG1hOxl9DISHykhpEV1i72dfqBi1VFK/C5DFVxTxC0Xa0+ChtXPhdJy6CR9UTsJTQyEh8pbWR3h3oDrV2acOnx4V60YjvwMpeOpF3QyHoi9lLCRianF5HDc/L27ai0clc4Vsq4Yyo5Ng/Sc8wYlOHgbIjk69eBnFvCSmbcNxMiFiUrK/O70JSzi81r11OZ0bhp6+aWnjU0DZ6n5ZG0Twoa2b5uf1v3Fny6PhSv0rlkjR58OpIGQSPridhLCRs51+whLEKuLYdHcG6mk/MhkrdHe1WmchDJPnd4htMLaQEfr9/XjoNIhpMLoH2IQEnLclVUeZ3zdm5r2raFZSVq5GzrxuXt3IbfEZIGSSkj29fpp/v8g62HKrtT/q5tTbyGmywcalapLrx65GViQSn/FKCR9UTspYSNbNZLY08T7xHwmHdyX7ZpXqNe3kn066NC6WEydzBE8swfoihdSVnITZnb2bJiNUhR/SG8mwq4waNF9dqKcpVosYVD8ywaKtsLkjZJASPbutvX6S9PhJfX1P7aV+flpeTKMsolb02Kj1e+QZ3ktWhT/eSJSBoDjawnYi8lbGQkPWN8I/MONXepzl6RGXdOU2WmX7vkZHMm/y2kZXy8lKRsnKx4/I6kHdDIeiL2kv5GJialRfhc5NfDyEa2r9tfYUu/MYnknDeUvhxPL6TfrbjyUlSWLmzIbNaqaZwsW/eC9vQbGZI2QSPridhL+htZ+h40tdJ1GhD5tTCmkVXFPcGe0hR6duKil1KVhFeSKqcTffleWSZNLFmjp+6z0kgaAI2sJ2Iv6WnkSVPmSN+DF3yu8mWQXwxjGll2eoHpWEXK8CUTxtKpClTMvJ9O6xFxqIvnLtIoaGQ9EXtJTyPLFszVuWJcTpUzIYUJyU9I8fyFcdTy02M0IxcoWVl6A0ie3h3hJWjpUFlesoDr74tGaS/oXfLOOaGf0ibOyBrI37gJ5EpPdAgT6crLW0PSAGhkPRF7SR8jk9/sWeHoz1/E9U4JsdUWMHHk1zi/dPUm3xTyE2E0I8sHyBe98gzsIitDRXzJ26J2XW2ijbt5i8bExxuQFc68ZTIUlqbY4zA5TYJG1hOxl/Qxsu/HAFa4SLm6xUpXZXGws1hAbC0q+vPwURPhD9vs0SehiW4ZzcqSvI4ks4M00dzaTfw1k3yxA+0mbTQ3atHyeRzNrOK9DgTVxeF50zZ0rh6kkHz0yzE88iN3YloWWkugwfSMcYyssHWT3piXv2Nr3rDk0tLsK0bzdRmZ90xntyHFqQKjbDs6oZJRsnp3viLyw0Ej64nYS/oYWSxsYeNuaeMubooFYBBNCGnfTXM7yejx01mBDx8D+dZEwOlQ69Hj54Rkp42QfMJjuT8U5XKpnLIryvUdRG85AQKDguERdh0VHUOIKTtnQkhhsC1LJ0RlKRwbOJeY0jlUClv3O3cf0mKm7gFBwVAyOEQ9dCRtUBzdk6z20KC5lRu1dq5SNCV3KfKbHclT2szKlZA84qGmT4xj5OKVO0mnWMDYNu+IrtICmQ7Mkg14ecjlpTlnal5emhQYU1/VXuJT2LjJJnIgaQFDjGzWrJHS2p1BvyoJiVk2TxYTabp4jssAJHuRZ8kKqIijLMu0RRMxV2HiytfVE7GXEjXykOFjWUnhly1LAtoeJhZiMXDr02cvQXDSt2rQp1C+QREwcuCnUGhWYUvPUzdv0z0kNByM/LtlObrZtqdo5Fr1WiljjQwRv4BPoOAp0+aBCkDfr999DAgMXrNha2TUZ9eKDcaMp1d9CLGCQ6IRU/cmLbuVq9jUrnxzMDKUmTJjQYv2fWAXjh71YVBPckNhR1+/QPgM+ODrD7twqtAQDn7ilHl2bg35w04/GMfI0vMJqvzORLihU0RRrjI/ZFYWdlNaxT19bEsHxarftROWLZo2pE0V1lo4KUtkIKmEQUZu3lhshxk519QB0sbZ9WHDkexFniUroCJl48vStMDV1ROxlxI1svSHsrh3oubEhZgS8+UbyVq2ReuubDNRI9PZzcT62PHT4EcLGzfQJRiZkOKhYeG5lE7MyOBWyFLGGjmrBfU1yV6WCCGn0mnYqAn7Dp0gxBLSRSPfunPfUphtBUauVb8N/BelPRowIwv1skNhcytX0cjU8tnsmZFhR8LHD2neTn5DQ7rC+EbON7ATifsihk3TNnEWuBBHPRmP0iVURLLPH5HhyFxtSiE32lRBrbjt68Z5uyJpAWMa+fJSacvk/BK+SvKQ7EWeJSsgM3LWzZOkh6Q5Tq66Poi9lLCRCTHn34BS8hR0BoGyeGRkNKv1+s17lpKwkd+++/Di5ZuDR04KOyr6+u0HKuhcLiYFnJet3rR+0z9detJbt2fN13w3Vdi6Q/l7Dx/DHmHz5au3G7fuhgPoO2Dkhs27CLF59fqtU/l6g4dPgFw//yBWi6jKV6vd4s3b9zAi7jNgBCH2cHjQFCFFLl+9BenEsgLJ7HTv3qOBwybcufvw9dv3oHJoCozcsEW6XjvBOEYuUU17jiLT3hmyExTwWoTxr3YzdtTT/dmp2nd3x5l6bO5CC8etm3OiVvd4cS8NYjQjX4mrY9nJCnhR5ZYsgZLXJQO7z1PkwhKldI2U3M7k7GIxV9usYGRlThc6w0eAGVYsIDOy+NLNsmeapswfznH2qzdiLyVsZOkMCmm6OHB+8OgZ+EssAyNQ6Zg64bcqksYxjpGLV+ksxsnVZeRS3LcWJ1mBJWBk8yur+FzZZlbxnYBGTpMYy8hS8g3tEqdkXFmLmEzsqykgud4gRRzPSlK88vVsp928oNmFmCI3sqQi32ySEHspYSOLxd6+85Wmi+eLwyOoqbds3yuWDAkLz1/YhcUjYkfNyM9IChgZXqx6GTkW6Slm+F7DFc62bbK4iUZOg6SEkZVxXyf0qhpLN3EmZxbla0cvOkmLaae0ZysHBaCYZlM48UULxJbPuuNvbd1YHUsLxDHycboMJsWGvjJV+TXNmkyRLJulN2IvJWxkJD1jHCOXrK499ZNt7TjZdTw6uJDc65FzxmDpy9SshfZincKSXliPU/eiV942LcVNBzyPnPZIISMr7Dw1xS5IBqexFbUpZxcDCRUQzn5IW9ZgGWfWhJguNbJ4VTnn4hGwmXHPDE0x4Sp0UhF76QcaWZx3nDB6Fkub/NQHbxwjS0VpVqs+kY1zzy3OuWSENCXrjinCUNrbksSZPU7OL/nDe5S4qcrrTJsy15YpWbOXtDySFjCikTMdnKWyoL9/wWAngjOeXKBJsaYDVYY4as54dG7m3bHntQprRsS0QOwSK/EaWTYMj03UGll6mVHlqiE2RX4WWw/EXvqBRp68cCs8Vm/Y2dTK3UKYWWxW2MXSxv0PC0eIQ4q5lavC1n2G905LG7e8BWmBHBaahRByK8vmVJSFAtnNaWEoRhFaoHVt3H43pwvUWVjTXjK3pu2YWbnkL6T5YgHFTAu7sJ2K5LCkjecUHqEpc2E1JbYJcZKtmImKTr5iBwlxE6Uw8dmG7tpc2BHsDhrJZkZ3rRCe9BwKKOxWoBi9hTiXIu5akmke4xg5zskE4V0R58bofML1OsnFPd2wmRWSinkH0FuxpRWtytaX10J+NMYy8m9bJgmJki9JzLCSr03iTAltCr0RVKtOTcuSb2m8kfOOir3VSDgXIWtQNLJFAe2qADrIl+SJyWIv/UAje28+7r3lBBi5TY+/mnUcMnfV/sUb/gUDkpwlMuV1IFlLkAzFB41dOG/V/imLto2csmzq4u0gQWpDZdkcFo4FilX83aw0qDlr/lLkt+INWvfrN2oWW96gc/8JoNQ6LfqWrdDYa9OxoZO87FzqT5izwVKYRQdenuH9z4K1hyfO2wSbhNjQqRfZSxBSuGqDTvB5MH72uqETvaZ771y47gjsSCGoNoOJ3W+mpRauO7x449GMeewhJXM+B2hEWbxym+5/9hk5G5oaOGZe3gLlspuXJqRIo7YDlm49CQffZeAkjxptIALpWfL/TAuZGsfINm7NpWuzwfsh8ybtyV8g78BOOqYkxwVespaF46xcQcfRZxaJmwr61MpXwEB+OMYysni5TFHaU0y0LEeXnVJljJ2lbu2ec9ko6SLarIp2loWVGy0Q+7ku3u4h2YuwGXs6wsKRti8toDGy5OVqUaaauXMNhkVZ7cKwSZ0rLfbSDzTy37FjZDDy3FUHZi3fPWflPnuX+j2HTrewgRFlmVFTV8xfewjGyONmrxs5ZXn91v0r16c/JQFj28btBhET+yKla7pVbVWoZCUwcknnugvWHhrxN/1EBCOXr9kWEkHiPYZOA9FPmr+Z+RfwrNtx2pIdc1ftG/E3vQYLevWAwn+UqN6oW7fBU0uXbzxl0VbQ7pJNx7oO+rtaIzp3C1Res0n3Wk17Dhwzf86KvfCBASPucp7NoWUwsmed9p37T1RSI8/PV9Clfsu+xcrVnu79T7dBU+at3j9/zUH4ROn359x6LfuaCkP4nwXjGFlh6ya9uKewq0i4QXHWrX/TwY7srhCGpSu8AUzG9o6TKAyZVTmcxBS7WnELIGkDoxuZv5ZAL0VIbhTSZp2Lnd8Wz+e9uCNtimDkzAe0KwvKCjAjZ101VltAOg9PcmymrZtr0/VA7KUfaOSUo8sA6kdDgLHwuDnr+XT9cfT46e/3M46RldwsCHj9ZT40S1Ym27oJkJ7h0BwVKUd9betuaak5V5hz3jBZYTqLLu4P6OJEi7SJIUY2r11XRUozpFPKLGw9xXRFIY00TXu01VwitnE37dhKPgXNx9usaRONuAu55e/bXlpAshd5Sr6e7aSbBYitsGkXm1Iqzl4kJWlrcbMSRuylX9LIiFEwmpEV1i5Fymt+sVFJBxp28BLMvuwvvqSKlMmyZzp9jZ5f8seaMaosOn7nKeOxeSTuub+SNXvhohZpE0OMnK4QewmNjMSH0Yys5Kam/b5qDLwK87fXTh3Vk+zef9GKHbUVwcV2tTRrAyJpDTSynoi99AONTKcrCJhbuQL5CmrOCrJZCglDctvxiaaxUykYuRRl8xbQnmlUCieg4VGaCClwAPrsMR1iTCMrbNwKO9aRpmTZPgVeiBbV4yQmTN4BnaFKjmn0x89F8HxFWgaNrCdiL/1AI6/Yfjp/Ieeq9TuaW7uWLd+IkEJsdto0r53la7S2c6mrLFIerOperZWNQ5UajbqAN0u60AlOK7b/Z2njNnSil4nKyaVyMxuHqpXrdihbofFf01eDXouUrg5lSObiWU1LkRwlIA658Ah1W3Yebu9Sr0S52ibKcg6u9SCxbc8/TQu7jJ21tljZmmaFXWoI1/EQhjGNrBRu3qO/tidNzC9MEvLxtvRI5NdLzRo3Yi9cZb4410atyjXE8xVpGTSynoi99GONrBTmWmQ3d8xpWcbSRjMreeG6w96bj1es1W7Oir1dBk6esnhbi870HoKyFRr9rqTK7jl0eoFiFRasOTh43OLJ8ze37TEahr3AX9NWzV25b/byPVCmTc8x8GhjX7l2M3rfgPeWE9mUzq26jqjboteCtYe6D/6bjYvByNb2laHu5AWbRwrzNArbcT82lF4xspGVbDwrE6jSlVxZRl+Ul7zzTuitMpUI19ZDlcMp18Kh4kUY2S88qYqUx7tC0jhoZD0Re+kHGnn1rvPwWLMxHZZOXrBluhc9EnbuAobGeVTlsuYvNWv57qETlrTq+ickOnk2WbjuCERg1Azl563aP3/Nof5/zm3fi85FWbj28NhZ6+iEuTUHWftLt56cs3Kfpa37tCU7za3dF64/0qb7n/Vb9V2y8eiA0fPnr6bFOvSm4gamLtkOI3RoVnqE6RzjGxkoVlk7E06LrYfJ5H66p3BeWZq3P53zKANG3LggctoHjawnYi/9QCMjaZwUMbKS/uxev0Kla/HpGixdVKQcnQMnWe9CRpHybQraJXKiA0kLoJH1ROwlNDISHyllZCU9/9vAod4AcXkB/VHYuNnX7a8qVpHPQtIgaGQ9EXsJjYzERwoamVG4TF1hpkSc26PjQ1Xck7pYdm0QSdugkfVE7CU0MhIfKW5kho1rM/s6/YtV6igsfxF31CwMootX6QwutipLJ8cgPxdoZD0RewmNjMRHKhmZobB1K1CySokaPexr9wVBA3a1+5So1o2eoEj6yQ0kjYBG1hOxl9DISHykqpGRXxI0sp6IvYRGRuIDjYwYChpZT8ReQiMj8YFGRgwFjawnYi+hkZH4QCMjhoJG1hOxl4I+hfLdiCBAeEQUr180MpIEpEae9/gMbyIEWPD4rPQNxXcjghBSgnevGo2MJAmpkemr59Jy3kfpncsrZW+ot+8+8j2JpGcIKcmLV/Oe4pPQyEh8yIwM3A36KFdSOubBJ3/+DQVERccQko/vTyQdsmb9Vv4VIoJGRpIAb2QEQYwIGhlJAmhkBElR0MhIEkAjI0iKgkZGkoBOI7/xC3nlG4xAP/CdIxKqjnjl++nFByRd884/oReJGo2MJAmZkUFD4dzrJz0TLvSJLDFMHfm/7xgwaMMbP/mLRASNjCQBqZF9A0P5Fw+i5noGdYyBD68/6pYyGhlJAlIjfwhAI+tG2jOh6gj5exEDBiHwrxw1GhlJEqKR4Zs4nq+Ij3Chf1j8pe8n+RsRAwYhBAar+RcPGhlJAqKRYejHv3IQEbF/XnxAI2PQHQI+oZERw0Aj6wkaGUOiAY2MGAoaWU/QyBgSDWhkxFDQyHqCRsaQaEAjI4aCRtYTPY185dpNvpOlREZFy+v8ciG+eWCMcGGdJnmdXyKgkRFDSaqRK9VorqRrDxbns4DlL67QJdPOL+SzgJCw8NXrdwA6F/aOiIga8ezcn8/P81mMu/efAO99dS/Gdvzji50fHh/++IzPMgp6GpnvYRkWNu7yOr9c4HuP70x5nV8ioJERQ0mSkSMio8WKb9/7yXJh7CMuYjnw9j6++poNOxkr1m7jc0c9Oz/m+QUGn/vg0XNmZIAXepA6HHTMeBEcyFc3HGMZGZCWHzh0XMlyNSBy+84DaTofvnz5Ao9TZy6SZ6S9wPcej7T8hMkzTYt4svj6jVulWXwghMiT0kxAIyOGkiQjq8OjxIqnzlyU5YaHR2lXFuZWeQeNikaGYTLXcuToWB0D/Mzoew+eJmDk+5/8RSP/5/eab9xwUsjIfQaOrlW/NUTu3n906MhJQoOFe9XmYgHPWq0JUf2ze//nGPpNf8qMhWJWmg187/GIhb98/fqderZYZCQ9n+PgXHPj5p2ung1Zbs8BownJRoj9oX9P3rl7XyhJiGm5Rd5rxRbSTkAjI4aSRCNHwpduqKUo4sFnAeT8AmbkqIhoPnfrzgPMyP7wyuVyH3/yZzr2en2TzwULMx3fvvuIzwV2xBqZzzIKKWRkQuwIKQKRW3cedOoxZPY8LxBOmfINxAIVarSsUa/NH1YVmZELl9CMJdNy4HuPR1qekD9YJ0AoUabagsUrVq3dxDYti1YkJPvylRsHDR93+85doTAN+W0ritXTTkAjI4aSVCMDkVGf+URtbkR0RLh8DCsCYuVHuNrc8MgE6tIC8ddVJ1bXQFLIyL9k4HuPR14nnjB6wmx5UhoOaGTEUJJh5PQJGln/wPcej7zOLxHQyIihoJH1JIWM/L//aReS8/X7FP1ZOy0MvovAY/RnekEPssR0aXjvG/gpRA2Re49fs5SvX7/FKfH9++cY2oIYoKkPfkHBoeFskx2A9DAMnwjB9x6PvI5wYOqIKPb/whGyfzk8Ito/MATi8H9BrrwO9E/ciXQf/D59+0Z74P3HIDExXFfFlAhoZMRQ0Mh6kkJGPnjqOpj39Ts/tnn+2sOlW06AlnYcvgibh0/fEEteuvlEjMsC6NV78/GgYKrmmSsPwOPc1Yfg8ekr3xv3ns9aeVBamHntwrWHy7Ych8ipi3fvPnoNioD4w2fvHj5/NzNu+WQEvvd4pOWfvvSVbm7YfdZ787HY+JnVO09Jc2XhzfsAFrn/9O2anafW/nP6P5978F+v3H4SEn1uPnn51k/sgdmrDm7edw4iK7ad+E4/eyL/OXIp5svX+WsPr95B97JsK03/HtuNSQ3GMXL2+SNyzhxMzi2GODyqSNksWyZDPOOhOUripDR1yTN9gIo4ZlsxRmnrnn9wR3J+iVByiYqUybpxEsSzbZtsWbwSTby6TElKWdSsY+FSDaqQC1787pA0BRpZT1LCyDAyDQmlA1JQsJj46p0/PK7bfQYel8cK4juVCFWMzrBKsElAUCgMJ+V5QpAOk8MEG568eAc+Cd75BsLYc++xK9Fxx9EGBr73eMTCX75+/eeIj6T298lee5iRL157tHTzcamR+W8AopGfv/n48NnbheuPRERGH/7vBshXWuzbN+2XgMu3noRHRoOpvTYe/U47h34afY9tPCrqM+uuZNzGYjQjk8tLTUtUVzKlwuO15cqCbma92tACRcuDkZU27uT6cjBynnG9NO5mJdnj5aXiJrlILQxG1rTD7Q5JU6CR9URPI5tbu/GdLIWQYvI6v1zge0/Gh4BQeZ1fIhjHyJbVaykcPJWF6awmMG/evh1YusK2vFmnljRSpYZF2yYsESKWFai7oWT+nm1prkNFpZW7onQlSLHo0JSWadxAWay8RZvGSmuhTSQNk1Qjm1xaQee3XVjMZwFz5i9V2LqTTHZ8FhCgVi9+c3PxmxvhuiZFwNCm79CJA0dM/hQSxucCl67evnzt9vOXb/ksoMfDo3Xu7mtz/xCfZRT0NDKE+s27E1JEJ1u27ZGX/kXDW7/gsHAdr6gwdcQbv2B56V8lGMfISHomSUaOiNDeA/IiRD6nODxCe//IoGFj+epL3txkLHh9g8/tP2zS4FFTGHzujVv3QccMfg7cy5BPoGPGGb+XfHXD0d/IGNJtQCMjhpIkI6sl90kffH1bliU1MiEKeW54lGhkgG9Z1DHAO/fS1VsJGHnT61uikdvdP8I3bjhoZAyJBjQyYihJN/ISZmQ+i+YSJWtW510kG97fZzoODNPxwn324g3TsdfyjXwuWJjp+OJlHTYHqt7ZAzqueXcvfwe2UUAjY0g0oJERQ0mqkdX03IWOO6S1uZHR/BhWBEbKOk8ia3ITvKOPFeATRSISzDWQJBnZNyJYJ/JyGH6tYDQjE1I4+nMMKxwVHWNpa+QrcuydBpGo6M8Qefz0BSFFxUTkB5IMI6dP9DTyHt/72uWWdPHpy6+/PnK6DUYzsqbmHw5jxs9QCwsX8GUMQVhOxU4Z+2X28dPnYGS2U74wkpqgkfVETyPzCuYRC3/5QmfCskc+fPSjM235GbgsSO+yw5BGgnGMrLB1Z8U++Po7uNQhpJi5lasy1p55CjiTjCUhEvOFNqIWvpayrNnz6MlEGFND+vETpyH+7PmbzOZlxXOIkJVD6cRqqQX56jRyxerNxW+jEDGzcjW3doN4MJ0FpUlX2NJDbd2hD9sE9hw4yo5fKEZT4MBIfmf+H0QSAI2sJylhZAjLVm4kJOe3b9+Onjhz5eqtabOXEJNSLGvO/GXwePbC5es36ZpnYOBV67Zt23kARkyBQcFq4V7nhd5rjh4/e/rsJZ8rN2Fz6cqN2qYxpHowjpGB1eu2SMsP/+tvZfxGVgvui4ik42i2qSjiASkQIfkcmVvrNe3SrE0vdexwmxUT25QZOSbmK6QTUoAQG0i5dfseMzIg/mAEMS3PqkD71Rt0ZnshhDi4NYLIvftPSHYHVtJU+DhB9ASNrCcpZGRCCk6YPDurRbkxE2aMGjtDSFHC42KvlfMXrYiJ+XLB52qPviOEFSizfac3X9D1KC5evn7/4dMOXQdCvKxn847dBo+dOGPnrv2LvFd/Cv41b774KYJxjAxj5IymZQgpREiRYyfOsCrwEtEamciNrIg90bx52x7YnDGL/oqPf0CQWEBQtub6j5iojMfIZrYVv3z9BpJlVZ48e8mMzH6xYtpsb4h36T1qy/a9EKlam960IhIcQrtAujt45UoLIAmDRtaTFDIyC+8/fPx76uztO/dBfN5COjSG0L33EHi89+DxitUbIBIWFj5m/BSIvHz55tXrd6/fvIf4sJHjwcjjJ04/fpIu1zB85LjYJjH8gGAcI+ez9WTFwLOWsWcwchdwjhLsSYhFj94j1HGNLNY1KeAs7oWQEmIBkrd0DkU5ks0+m0VZaS3eyDCkZRGq/t9Lq+M3cq3GXSFy0ec6JFrbVXr89OW69VseP30h7LoY3V3GkpnNykDuk2evwO+9B47h/1lERlKN/ODx8wlTF54648NnqYWpFOcC3twM8uWz1MIXpgJ21axL1+SzGB1v7SJX1sQ3ZeL23UcHDp8Kj9Sd+y40pPHDIw8/6f4VPsNJUSMbEp4+fylPwvCDgnGMDDx/8UZavkPXQZC47+AxthkSGq6Ox8jAtRv3pLvo1muItKlZc+kyF2It3shKYSaGmp6OiIwUxrmv337QaWRl7LkRRvTnL2yP0t0FBAZDypOn9K6tXv1HS48T0UmSjAzP1Iy5yxgf/YP4AucD3jJ4KUvn1bBvXTLIhcWis/g5xUdPngcdM/g5cC+Cgzo/Os446/eKb9xw0qyRMaSdYDQj0zdJntLlPOrZOdUkpnSYqUnM5khM6CCXECtAGhGh6xgQK3YFj5GvkEuRUlWt7SvDQFvTjra6tRCno2kxUVHEw8ahCsnooHNH2WHwS6ygzdimSrp5NshRMM56LtlUbnDwJEPJ2DLFoUqegpoqSAIkyciAaORrN+7yuaKRAVkW+3xliF/FpEidxc9Z3nfopGhk6QczY9e7+6KRhz7RnHkzLilk5J1HLn2PXeONPe7+97LXpqPPX39kK7qxVSLZ2pJ8WLHtxIY9dJU4FubEXfBM/wDts8U5Ewhfv37zDQj2D6LLy23Yc1aejcG4RkbSJ8k2Mnyn4XNFHfODXDU9uVSA7XTO/GV8bvPbuzTOOj+fzw0NixCNzOeCwUUj8zY3Cilk5DOX7sYIaz9uPXDhu2R9Xgh+gSHhwo+BBn4KXbThXzFdGgKD1fPXHoavnsfP3wahe206tmr7yUOnrkOiOoLWDVPHWYk4JDQi4FOYJh6mXZn+Y0Dww2dvxU0IoWGaisFCsQdP33799s3XP/jVO7+YeKbrYUAjI4aSVCOrE7txTqeLtbkJ3pUXLriVT9cWiL8uzU2wroGkkJFZCA4NB/+qw6PAktOX7Tt75QFNDKHTKthavZHC74nEF6D6gZPXrt15umTj0XlrD6/ddXrjnjPiL27Q695Rn78I85rf+QaxH9cA17MV7mWBfQZAeO/3CapERce8eOsXqo4EZTMjv3nvD4PliNhiGKQBjYwYSjKMnD7R18ixv8YdH443NsvrYPhVgtGMHBkVLcVr2TpC8gnxeG/egywowCVqqsD3GogTkpGQwhCJ+hzDCvxW0H3dhi3SKjDq6dprhKwdKfApLR5Y9OcYdu+fPsAxsBl1fBYigkbWEz2NDGHRq0vk/Hxybh7PlbCP8tIYfqFgNCOzYr4fA3z9KHMWLM9XyKVh824AX1haRZYoVgGN0kMhGU0Lu0JK45Y9lLEzJVav3SiWr1yzufRCok5YrcPHzrx5+4HtVJ97QAih/QBGJqQon4uIoJH1RH8jY0i3wchGJtnobAcGjJHVwnk9iHtUaSaevxOHnGwzTHiZihObxLhoZBgjs1qEFBOP56NfIJR58Og52xRG0/GOfJmRCTGRxAspbN3ZLtT05u8ApTBhQ2jqc1R0nHUg7z96Brn+gcGafUVrRv2xhYXjzF+G5W4VbkIRdmHFIpev3lLS3jAXr+/DP5itcHnWAvDilWZSgULTb9r+9/1I/02ga6+hYiIh9vz/+ANBI+sJGhlDosHIRhZRxhqZxcFcVMRFK/49bR6krNuwVVqFyfrWnYdiolK3kUuw3NCw8Hcf/B49oXd2AJZFKoi1dMJU+Ck4THSiwtYjIorGHV1rN2zRDSLv3n9kRmb7ivnyLSRU0zV37j9mHxug5gDByy9fvxcPlRWWbrKIFMj9HPMFshZ5rbawoUfLPnVYrnipasr0+eaxd7vMmr+cRarUask+imgPZCnN2s9bMA0tvoFG1hM0MoZEg5GNrCpR1cG1HqCMa2RCzF68fBsRq55Tp33EKsrYhYoihbGzmMgbWRn3rAVrCsaz4lDXzEr3T0ayWl++/g/47+xl2J246gXUFauLRmZ3eLOxKtuveFSsjNSn4rqjbJP8bn/qv/NqejvMN/C+WJHkLv38xWu2lKiYKEaatukNke27Dg0dMQEi23bskR7/m3cf1bHjcfa/jPhzvLTAjyWpRj7m+5Rc2zTn+SU+Sy307cp12//Ze4TPAiLCo3b7Ptnj+5TPYvw1fma3vn/p/FwE/nn/cNTzC5HxTLeAz2yfKzc/+um4b8Uo6GlkUxs3RfEKipIVLe09LUtVsnSsbFG2qoVTNQuX6uZuNczL1zKvUMvMs7ZZ5Tpm1eqZVq9vWrOBaZ2G+es2yl+/cf6GTfI1bpavabN8zVvkbdkyb+tWedu1ztO+TZ6O7fJ0aW/StYNJj44mPTvl7t05d98uuft3zTWoe67BPXIN65lzRK+cI3vn/KtvjtF9c4zrn2N8/z8mDvzj70F/TBmcffqQ7DOGZp89/Pc5w3+fNzLbwlHZFv2Zzeuv35aO+W3ZmN9Wjvtt1fisaydkXT8x68ZJWTb/nWXL35m3T828Y2rmXdMz7ZmRae/MTAdmZTw0J+ORuRmPzst4fH6GkwsynFpIziwi55aQC0uIj3dmn6VZLy3LfmlFjssrTC6vyntltenVNZZX1ymvrSt0bYPV9Y1Frm8qdmNzyRtbSt3c5nhzu9OtHa63//G4/U/FO7sr3dlT7e7eWvf217m3v/79g43uH2r64HDzB0daPzza/tGxjo+Od3l8osfjU72e/Nf3yekBT88MeXZ22LNz8DIY/fzi2Bc+E19cmvzy8rSXV2e8ujrn1fV5r28sfHPT683tZW9vr3x7d+27e+vf3d/4/uHW9w93fHi868OTvb5PD358fvjj86N+L0/4vfrP//VZ/zcXA95eDnx/JfDDjSDf25/87n3yexQc8DQ48EVI0KuQT29Dg31DQ/3CwoLC1DCgkz/fcYORjUx+l5+1UAs3N2tyM9sVLlVDHdfImc3pghjq2DvoWKIyQSOvWbdJGXvzXq7CdP0gBisQpqa3REuPjdViZy0YzJURkfQcsYjUtsLx6zBynoIuauEkCUsUC4tlSO5Sp/47p+aMrMklVhnyO8oSIdKktcbIHlWbQ+Th4xfCASjuPniycNGy3fuonspXbykcZxF4NCngvGvvEfhP9x88Lh7AjyJJRoZPZccb2xiRutatX7NhJ+PyNflvPgE7PzxmwNuDz23Spm+7rkOAtl0G87lb3z0Y8/wCI4Kb5RYe+wsjAKiZr244ehpZUax8mjPyzGHUyHNH6DRy1tW6jLxzmk4jZzghGPm/RTqNnFMwcr64RrZO0MiV4xq5sWDkFkkx8t+JGXlTUox8J0Ejh6QFI+dQOrHIteu3WOT0uUtiFZGO3eiN1yyujMfIj4Wbm4F3Hz7WatiBxV8L1+uYHJmmZdfieCMDd+8/gcTAoJAwoZFzF68mYOS1G3awLLbHmg3as0NNqpEfPnomDt/ERKXEyOLRiiN3QuxMC2tOZUB1FoEx/q69hyGy/9BPZmRANPKRt/dlWdCfopGXrd4qzw2PEo28U5eRmY4Z4pMlMvzZOdHI/DD58dMXopGvXNfxYWA4ehqZEHNi4khMyxCLskTlRAo5E2tXUtSNFPcgJcuTUhWJoycpU4k4VyZuVYlHdVKhOqlUk1SpRarXITXrkNr1Sd16pEFD0qgRadKYtGhCWjYjrVuQdi1J+1akU2vSpQ3p1pb0aE96tSd9O5J+ncmgLmRwVzK0GxnenYzsQf7qRUb3ImP7kIl9yaR+5O/+ZOpAMmMwmTmYzB5K5g0j84eTRSPIklHEaxRZ/hdZMZqsHkPWjiXrx5GNE8mmiWTrZLJtMtk5heyaSnZPI/umkwMzyKFZ5MgscmwOOTGXnJxHTs8nZxeS8wvJxcX0h758vInPUnIJWEEuryRXVpEra8hVYB25tj7btQ05r2/Mf32T8saWQje2Frm5rfit7Q63dpS5/Y/T7V1ud3ZXvLu38t291e/tr3XvQN37BxvcP9TkwZEWD/9t/fBY+0fHOz060fXxqe6PT/V+crr/0zODnoKUz498dv5PkPJzn/Eg5RdXpr68MvPltdkg5Tc3Fr2+5fX21vK3d1a9u7v27b317x9sfv9w24dH8KqDr2j7Pz47+PHZv34vjvu9POX/6oz/m/MBby8Fvr8c+OF6kO+toI93P/k9DA54Ehz4PCToZcinNxIjR0QlMgvbaEYW1vqTL5kmJsJX+/ZdBxJSSprIIgpb976DRou/ribL5Rsv5dGwO11aMBPbtHdtIGzm40uK6EwU0m169BsJB2ZhozndIS2p4Cq27tSvYYvuOgtLN4X7vMW4tkyD5t1atu8bt6QmYkKXxyPi0J6QAsNGTqzdqKO4Qh5g7Vh78PAJ5DfNvebCeBlCEbHAjyLZRtZ5J4hoZF6pwJb3D5mO+VUvgLmLVzEd12veg88NUUcwHY9+foHPBRL4XVSjoKeRMaTnYDQjI+mWpBo5IiIqWB0e3/JsauHKLZ8oEibAp4skUD0iPCokwYNkl3BTCDQyhkQDGhkxlKQaOd2CRsaQaNDfyJqFKxFExo5/9rEXSZg6kSUp0jPhQv+w+EtfNDIG3SEwWD8jq4ULUAjCA9+fxBdJkPCDLAiPtGf8Y9dOw4BBFnSOaXQbecXqOKtJIAhgYaOZ2c147x/Cv3IQNdcz8jciBgzfv7/y1dwYLEO3kQHPGi349ySSbrGwcWfTDaXE96pKz/B9Il1ZGAMGCO8DQvlXDiNeI6vphewIQgrnUjkj6Zks5mW3bKc/WauTgGA1DAnhe/qnkPD0DPQA9EOArjODauHM8ivfT1+//U/+1sSQzkJ41Gf/TwndlJSQkREEQZDUBI2MIAiSVkAjIwiCpBUSMvLlKzdzqrQ/Go2kTyzpz4eT+JZYe/0xOChEHR4RiSBIooSpI/hrv1LiNTIhCv7NiaRnQsPk9+m9+pjQawtBEJ28i3/mqG4jk2yl+TckgkhfJAl/1CMIkgBv45GyDiNLl51EECkRkinJwaHxrvKDIEii6HwH6TAyrjSExMe2HZqJyaHqCJ33gCIIoicfdN0ngkZGkgCu/YYgxuJ9gI4TF2hkJAmgkRHEWKCREUNBIyOIsUAjI4aCRkYQY2EcI1tYu7JHCysaMbdyVQib5sKmhbXmh+k0hTVlXNiPyEEZy9hfrmPE1tJUB6AAi7NHsTzbZO2IrbFHsS6S0uhp5MgoejsJe2SIP2cXJczWYI8swuJQOCJSUwbikew3YWNzhRa0LUurswhD/PkoKCbLQpC0hnGMXLlhN3is3qRnjWa9IeJRi/5Us2e9LgWKlodIlUbdlbHGBKAM6Bg0be1QBdwqmtSmVDXweFnPpky4lep3KVCsAqviUrUVFCtSupp7jXawWbtlP1bL0sYdGilSpiaUtHetBxUr1u0E6Q5u9RXcQSIphJ5GDlNTJwaHqI+fu7X1wHlIuf/4jVoi0FkrD7CbAOevPRwoLIW1dPOxgCDNpec1O08FC/cBQjHxtpTAoFBoc9Ne+uPf564+hMeg4DCQOBQ4cPJaeHjkO9/Ae09eqwX7r999mr+fBUHSFMYxcpWG1LlOVVowI5cXjFypXpfKDbqCOms271OlYTeIwCZIs0azPpBbtVH3Oq36w2alBl1cq7UGI6uKVVAIkq0qGLxS/a5QnrXvWrVV5Ya0KaVQwKywC5MyFHAs37homZpKwcKQCCNr29LVS7k34A8SSSH0NLJaUC08Xr/7/NU7P4is23V61xEfMPKOgxfAxZduPtlx6CKkz1l98PGL9xCZvergjBX7Wd3VO07NW3OIJW4/qPkxafA1CHr97jPR0Z/BucfP3Q4MpioPCQ3/FBy249AFSAdH7z16me1OrIggaRPjGBlJz+hvZARBEgaNjBgKGhlBjAUaGTEUNDKCGAs0MmIoaGQEMRZoZMRQkmHk8IioiMhoYyHOokuAiPCoiIjolCTxY4DjfPn6/brNu9YblWMnz0fEs1D1D4d/soyDHr1N9y5/jpKHXvsyFmhkxFCSamRCrPlGDISQzPyOGOHhUeTCQnLRKzW4upY/AMbYiTNnz/eKiIwCLxudm7cfEJKd3ykjKDj89cfgFILfHSMy6jMhKv6ZMhYkZ6kwbqcize/slT81BrHkZXAQv5eUAI2MGIr+RgYfWcZOSzc6+Qq58HuMjIjm3l0pzIVF/GHktSqfCjenEKLjnfuGc6jR4XcaHhnNP0Epgc5eJRcWy58UYzD8wb/8vowOGhkxFP2NbGmTUjpmZDEvK9sj/75KBRyvrpcew8y5XuGp9c138PDx0s0wdQQv0JRAdhj8U5NyyHYNn4j8M2IsTnx4Ktud0UEjI4aip5GDgkP5uiKE2AEKW22KhTXV9+9KZ5KnDL11KHZw7erZkK8uEv35i7jHiIgo/k2l4fwS4uMdJ+WSN03kSyYL6T9OzNz43pARJum64FA1wJfRhxw2VaSbvDoZL94HSTff+IXwZbgqgXyiiHSnMV/idYXwLBfm06UFWITdLEZyOuYt6AKbxYS7wHRy6MgJ6d7550IDPLkXuESRc0v0e/aXSPeVEhjVyNbuFqWrmTtWU5nRTtQCbzPiaFa1noo4xklXuZpVqqMylRS28TCrXk/ebKqjyljO3KWmhY2nUhFncQxVLifzMtXMS1dVFo6zEIeCOFsUqSRNgf9CUcpTmmIoth6Wed3NKtdVyvowFtgj7TrJgbFNlYkzD1/dEPQ0cq9+I/i6IjfvPCTEOm9BZ3grTp+9GN6NJV0bm9h4lihX+/K12/kKuZhau9du0o1kLkNIQr8udvosveuP8SXqC/eOEri6jFxfrsrhRC4v/W31uIwnF2RbMca8Zt0MpxZmX/on8fHKumkyFMtwbB4UYG/UbKvGZjo4K8v2KSDuLJsnU31D3bXj5S3HEhWh/TZ95Oh/fG+IrFi9ef+h4xHCpblDR05euHTj+s377PzDwcPUNTC+hg+zmJivF3yuw+aZc/T+w/i4efs+a4rBq5NRyq0BWPjo6SvX7z1/+PLDsnU7n7z2u3rnyfN3gbsOnmKCfhcQduvhy+Nnr30ICn8fqD514eZb/9CbD17wrQFsgRGG9/K1/PMCmFq57tl/dOyk2cSkdN/BY3MoytVq1Pmv8TNKuTcqW75R/8HjCCkKNh8zfqaFjRshSnunWk6eTZ88fQmvin5DxvANMggpJu463s9gH688vTuQa8vhWft9+WhyZVnmHVOzrRzDcv/wHqUiZTPvmq7M65zhzCIxXSd8nxsXoxk50+HZcQ796jJNlpmb7F8ybd8C0tmrOV/fjvCY8d+5tKStB8QtS1bmG0898rvIjhZGUiyLvjml6ZeW0vRCwn/n45115xSIKIVv5dm2TIJ3rLxlA/h95WjZUVlUqCEtQAUhpCtjbWVZqSaMCPIP7iSrSBGfGiOhp5GHjpzE1xW5eRuMbAEmKlCiyuOnL5csXeNZp/39B49BWGBkQvKbWcN7r2RIqPrNO1+LuEtTSTl3QSusBIycdd0EeEJVSlfLDK5Z14yHDjRv0igjKPiiF7w5AWrtK0stLCpA3KxaXfM2TU3+6glvbLNBHWgLV5YpTV0siSukyBsXiIrQanHv/iN8b4iAeuCfDggMDgwKjoqOISQbIQroh7fvP9Zr0gV0DG89Qn4nxBTiw0ZNJMQmRNcP/zCu3biTqJGPnrlCcrn0GTwGmvJauflDkPro6csbtu27dvfp3SdvQLuHjp0dOXZ69bqtduw9Al5es3l32y4DYWwL7iP5XfgGZUZevW4r/7woBSPv2ku7gmQs++FjwNv3fh98/ecvWgE9YFrYNebLN/h+A0ameyE2hOQDI9+9//jBo6eQDuVLlKvDtwlkKlRR3HVEeEJGpp/B8HYmDoo8bpblq5Ozi2Fo/MfMIZCoylDWopAnDMUyHJlrmcUtx/TB8hZi4fvcuBjJyCpXdrgqcxcqVuH7oGndRpBFP5cuemXaO4PGLwjfCwTHMYlIIzmWjoI3ibzl1EWrtt+dzevW18QLuFmUrKyJQ7Eszpq4lZtpzQYQMfesDaNpiFgoK9BGhHc133iyYbvLtm48/QBg37Ulxs89qicrQA8p1sgZTsw3Gdwt/9DO9INERCiTZ4hmtRBjoaeRQaZ8XZF7D54qhSkTqmKe6vAoEGvnnsN9rtxavW7btZv3CDFTFq347X/fT53xuX33EV9dBKQm7jHe9yfYVuiNzAdmqkjprKvGQa+a165H6BPnCINiFSkJOoYy4FyIW5SunGPq4DwjulMj92unIE45ZwzOvG+GipSStxyL9B8nJBPfGyLPXry+9+CJfyBILQq+JRBiQoTg5x8EqoLRsWBkcur0RTC1oGwdb08RWS6vTgDKsMfte4/NXrwWFExIrvY9R5R0qX/j/gvY3Hfkv8F/TVu3ff/WXQfByCs37GzcqgeUv/f0jXmxynyDr+OetYjPFWDkg0dOKYpWcq/WEv6Rpq27w/+40Gs1yeGw98BxMDIkwlNM/9+8peETqJRLnQePnsGmg3PNL1++xbd22Hmfa3F6gHsuKD5eeTu3gWc50+7pKuJQgJSw9KxBn2uQMuiYOBYgxS2JW+4xfbJunUzTZWe0RHRdtjUuxjGyhUd1dsRsM9PJ+XTzCtUrOUeve2b+ZxqNnxFOugva1RrZJ9bRsJkn7umOVMfCtHzevh2zbxNGcwU0o3uVRexRCScxLDxrif+sgpSDiFnX1srfnWhJ4mjhVM3onytm5WubTO7HzkjkhM+ti1ojK4pWZF3KBmuikWmB7HHOTmQ8OhcKZF8xmm/fQPQ0MpC7gJFPmMggpLhsj+SiPicHjczkRyelx3D2/CXpuDUBVqxaH/RJx8+s6c/2nftkKbw9jQ7/s/b8U5NCWNq4y3at50SLHPOH8YmJ8iGMrmOVohjHyEqlZoyszOgsjOOEf0D8vi/9wBEHd4XdNKO2S94qM5dc0wZm2TFF3myKkXk7PckQh9ij1WDjLmZJ0+nQiRXOpznFDOMsViz78r/YiRd+d8Yi+8IRbF+WlehZC/OGDcUjj2PkgvSzRFoxz2g2jjbmuRQR/Y0MkOwOfAtGAb5W87uje0zJi+883e9qFquTMmfB0k/ConQpB0ifkIJ8ul9QGO9QI8LrWC1MRk65aY5SdE5iiXeEaxjPggP4fRkdIxkZxLRfIyYtgikyHtKcXzZr0liTrus8JhEMkq9ne2G4563M4cSXMSKJGJnQAa8msWCcU5Y5Fg7PtkJz4l9RVn7KO9O+GXSADEI8vwQiuacNlBUwBPFacJ4hXTQpwqbSzEVp5R5rZOo7CytP1p/aukJJlUmK9GqSjAw0adUrf2Fj/p6ASQHnkaOn8jsS2fTyemoMli8svuj7gt8749mL14T8Fv35i9GB92b/wX+NGD2F36nIK1+5SY1CYHBCc0K69R4p+7UKY2Fq5UqIg04dM+4GfjDmJ/H5hdGSCwMpitGMTLHxUJEy8Jjx1AL6b8SeiwAsitKpCKaV6ak6wo0i6Xm9Uwvzt2lBSzpUZmNnZeHU+IzlyfLPNHaQ+Tu2lKarlK7mLtVZXPM8yc5OWNAvCkpbYXANWcIo+7eVY/ldJAPNx76Pt8pScwpFJZy55qFXpc4tznhMuFgqYDK6F8vimzUKSTUygiDxYSQjw7f1S3RsqyhRQWmt+b5vXqqqMlYlGU4soHF2ZS+uGlSZ6KlY8NdvmydRoZi7/O79J42k8DBZJ+aVNeeIKWcWMVTEMX/z5pojhyEzm19x0cu0e2tpXXLJO+eSETRy0SvjUSpEWuz8En4vSUVzqkRySOTsYnqmCPpThBW4sIQa+aKXpQ399RZNdXZ2SDitnxKgkRHEWBjJyEU8sgsa1XJBo12LmrXjpF/0gpLSiuCL7KvoZENL4bt2/q5tyJVlRHA0v5eURpxrIUUlnJylA3lpumyAXFh76pbmXvJWWdCJdCbD6O9dGYQ5bYdHVkx7Hlk4p69UaU8LsPKZhIurKQEaGUGMhdGMTLFxB3lRfxWIe/LIlt5zoSKlVH/Ih715h3TOcHy+uKkiZTLvn5l988QfomOKhasOxFxLV80/GPcOEYCcWKCw0m7+sWJ0psNz4rubI8nwhyQ9KmmZIvSyHnS1jqwUOwuERkYQY2FUIyPpkmQYOSIy6nPMF2MR/flLAhd5EOQnAo2MGEqSjCws0vjHk2ev+DkDyQakvMhrdfP2/fjdiRh3ssEbbm0dKR98/Qmx5TsqeRCT0stWbeL3gvySoJERQ9HfyHv2HfEP+MSnGws7p5r8vRifQlNqdeAAXVOMM5sb83ZNkfyFXfh9Ib8eaGTEUPQ0Mrhy7/6jfLpx4e+S4E1qRGT7unv/Cd8/xkK6pA7yq2IcI1dp2K3jwCkW1vTKkrUDnfQGNOuqmVNhya0LU7/dIL4RhmkhzXzb5t3+gkdzK1eFsW/+gQbhaOu0HiCmFCyhXaetQPGKLNKmz4QijnEW9PkhtOk9Hh4bdRwOj617j6vfbrCsQ3JOHZTl2Fwgq/CYKJZlqvB7MQQ9jdy6fU8+kSE7C8yPc/ky8eHrFyjdfOcf7zqTb/1DZRFZXFyjUpoo41PcRX9+s4h3gGya4E0x7DlN9D63SF0LtCO/EsYxcvWmPTsOmgpGNi3knFdVzs61Lli4Vc+x7QdMBkE7uNWnxYqWz25K5wC07z+5efc/m3Yd6VylhXuNtgWKVYDC5oVdcpiVghZyWZQpWqamg3vD1r3Gl3Stb1bYpWKdjqpiFdr2mwSNg5isHQwVCjXyoCnVmvSEQ7UtXQMei5atlcPcEfYIu4PNQnaVTRRlOgyc4l6rHRxJ9SY9cpo71mreh28qFYA+yaMsqyxWkeQoCV3XuNPwsp5N8yrLwWeVnUtdRfwLQiYAvxdD0NPIhNjyiQwLG48ZsxeHhKqvXr/zKTjs4RN659vWHftBzVHRn5ev2hQRGXXs5PkvX78dP3UB1Bwcqo6WrIMsBXKliw3xDmW8D1T7hUTBqBNse/zctWdvA06cv/4+MMzn5sMbD16cungTyhw66UNIcSiwfP1OvgUR6a75zmHAP0WIxZQZiyrUbEsIKV+txQKvNaZWru99/dt1GzZg2ESrsg3Ib/YvX7+3tHHv3o+ORXRy49Zd/l9GfiWMY+Sagq3Y53ztlv3gVdWo47DWvceDpsEg+Qs5127Zv2CJijnN6cReK/tqILuWPcfAY722g4qVqQFGbtB+aL4CdG4cOBfaqdywGwxRazTrbaIsa2Ht1mnQtPYD/gZdwiDRs24n/gCSBLQPclcKhwoRAMbjLXuOc6lKb9JjiT1Hzes0eBoYEP4Fs0IuDTsMM4sdvKc+vf9aAP87dAgM7Zt0Hpm3QLkazfoInytTXXbQ9YOSCr8LQzCGkd37Dhz1+u0HkKmiqGfXPiO79xkJOo6Ojon58g0UJhgtEyGW/oHBgZ9Cdu39Fz41+XbUehsZxr879p/ImN8xo4XzgBF/333yBhxNSJEOPYbvPfLfu4Cwq3eeOFdqTEhOQnLPWbzm6p2nfCN6Gjl/IZcZc2if5y3o7Fqp2dkLV5et3ECIqlz5+qDgz3RpN1v4HyECm+8/+HkvXw+fBHw7SjRyOsA4Rk7nWFarZdmykf4oLRP6Apskcq0fyws3Ufh2DEFPIydw1qJH78Hw+O79R5Dpjl0HBw4dAzpu2qoLbMJY2LN6U3VEVOt23f87e6lrj0EgvlOnL/bqO4xvR52UsxbV6rY+8t8lUHOrjn2ZkZ+/C+jR/88jpy7CuPjG/ec9B/w5YdoCiNeo15qvztDzrEWtxp18P/rDB8+lKzdHjp42b9FyQoqWca/30T/QPyAICly9cYdkL3377sNMZmU++gXwLTDwrMUvDxrZUHLMiHdx6wSgv6vCNZUMfiIj45U9A8Ere+kBNLKhsCX5k4rSKpFrOHryExlZzWa/BeLst+SAs9/SCWhkQ0Ej629kdcrdIeK9Jq3dIRLfb14kFbxDJF2BRjYUNHKSjMyIiIzixWoAMXrOjUOQNM6vYmQltxBPwvAtJBc0cjKMjCCITn4FI+v4+RI94NtJHmhkNDKCGItfwchsPeWkwreTPNDIaGQEMRZoZENBI6OREcRYoJENBY2MRkYQY4FGFrB1VySFOHtHI6OREcRIoJE9CtlVtfdsm1S0e0cjo5ERxEigkT2KuzXjhZso2r2jkdHICGIk0MhoZENBIyOIsUAj/3Aju/ONJ4q4dzQygvxKpBkjc1fPEkZa96c2cmGH6nzjiSLuPU0ZOTw8Mkwtf+UgCKI/gcFqPjG1jWygldDISUWsbhREI6uFBX34Fw+CIPoQoEvH6tQ3skOl9rx0EkWsjkZOKmJ1oIRHC+h/PZF9O2FIjQy89UMpI0iSCQmLCOMSGWjkxNHu/Wc2ssLGjW88YcS6IjIjq4WRcjj3EkIQJD7e+AUncBkGjZw42r3/zEa2tHHlG08Ysa4Ib2S1cE45KEQdGIwgSCLwbx8ZaOTE0e4djazLyAiCGAs0cuJo945GRiMjSEqCRk4c7d7RyGjkBHnnH/LWD0HiJTAkkRMXSTayfaV2/Fs3UcTqaOSkIu4djZxmCQmL+I4Bg97hdfw/3ph0I3PvW30Qq6ORk4q4dzRymkX+hsOAIbEAX6f4F5IajawP2r2jkdHIHG8+BsvfbRgw6BH415IajawP2r2jkdHIHCHqKPlbDQMGPUJQSDj/ckIjJ45272hkNDJHdMwX+VsNAwY9QsAnHVf50MiJo907GhmNzIFGxpC8gEZGI8sbTxixrggamQeNjCF5AY2MRpY3njBiXRE0Mg8aGUPyAhoZjSxvPGHEuiJoZB40MobkBTQyGlneeMKIdUXQyDwJGxmeAnkSBgxCQCOjkeWNJ4xYVwSNzINGxpC8gEYGIzflG08U7d5/qJFzopHTJGhkDMkLxjGyVela/Fs3YcCD0hb4AolQqZ1Y17KEJy+dRDi1UKyusE3yb4+W8GihPfiC7sSHaz9hriw16H/3bKOtrnAlPt7y9hPmyrJk7724ezNpXQYamQeNjCF5wThGRtIzaGQeNDKG5AU0MmIoaGQeNDKG5AU0MmIoaGSeZBh574HDhJDg4NAW7fvJ84wU4L0uT5KEuk27ypPiD5+CQ+VJ8YRv3/4nT0qB8O1/qbGXVAhoZMRQ0Mg8yTCyGBw9GvQfPGbDph2BQZ8We6348uUrIfkq1W4DWaDsCX/PYhFCSj149Kx2o06EmEDKoOETaHqB8pDhUqkJxFt16ANx1ma1Oq0hHhoaBvF2XQbs3nvQplRV/4DAijVaElJUaPB3ktcpMiq6z8A/CcnDKp45e3HQsPHd+4yAuGvlJmJrEJm3cLkQMR09bhpLhLBu447Pn2P6DPwrKvozyVN2xJ+TIfEPRTl4HD1+2ocPH1mxUm4NWFMt2/XxqNaSJRILD0Iy9xs8msZpKAGRmXOXRUZGDv9zMiGZYHP4n5OgfYjcvXvfxrEmIQ7Rnz8PGTFh5679OZTlxk2eB60R4litXjvW5s8Y0MiIoaCReQwxcgnnOt8FK8Gjo3u98xcuiyp8++4DG5z26ju0acvOEOnQbZBYkY1GQwTtfhdaOH/xqpgFIg4NVbP0b9++DRg6gWUFBgaxiKJoJbYjQkqyyNnzlxxd63TvRXcBKfsPHWclP8fE3Lzz4N37Dz16D1YVq8gST5/1EUxKoDwhCkIKsXRIqVS3g5BI2/ResQHijZp1EnNZBMKc+bRboj/H7Nn3L/ucuHb9TuwhkRIu9YRGisDm3XsPWCLJUEpIVLFi8InSvHVXSPnvzHmx2Z8roJERQ9m6bRf/gknnJMPIhR2qC8NhqxJOGiNDCPoUcvHSVVFbBRxqjfxrIkR27DpQ1Knu6zfvvn79Fh67Or6dc21axr72B18/cG5UVPTYiTNZFnynb9ulPzNyRGQUNDhkJB3AQvuwR1YGjPzg4ePvdNcOtk4Ng0PCwMiE/MFyP/oFHD1+isUHD59QuUaz78InhHhsLLLjn/3wuGXbbrFZSH/1+g1EWrTrzVLAuc1ad5PWYkE08o6de1u07Qnx6zfvXvC5IhQrevzkGYhMnbnou8TIYyfRf5D1FUT8A4I8qjaPifmiVkf8s/uA2PJPFPQ1MsC/FREEAPvwr5Z0TjKMrE8gmd1Al/JUYwcYI8uTflzYsGWXn19AzQbt5Rm/aEiCkUm20vy7EUH4lwqSQkbG8MuHJBg5PCLKwsaNf0Mi6Zl/j/3Hv1SQZBv5f0mfM9C++zB5UkqGydMXLVi8Ch7lGWksnDl3WZ70M4QkGJnx6PHzLOZl+Xcmkq6wtHG3d6oZERnNv0IQdbKMzFzMHnMXdJk+e8nOXQcJKRESqi5fpSm7okUIgTcgIXmt7CqxM6fsFGrPfiMIsWTtmBepQEjBkNCwfDYVcxTy2Lh1NyF/1G7Y4VNwCCF20dGfCclBSLZCJSsVKVVFaKH4i5evhWZKfPv2LVcBF/GQNm7eQYiFUMZeeKTzH2zL1u3VZ3CZ8o2FlIKxh6E5PEKKQSSDhRNroVmbHoRkF7IUM+d6hYbSy5Ikf/kVazazirv20PPO7boOEerSRqbMWMR2CmHz1n+KlavTrdfQ2L3Y9Bk4ipACQhx2XTIiIgLiXboPWLdpJ5SZPW8JIfkhxczabcPmXUKxQou817ADe/nqLWs2LYckGxlBkERJtpFZEFRYDIz8XdBcjbqtIFKvSSeIv4+dQ3bv/kMWEXRDzp67EFubhjBh6vG6Tf9s2ELFVL1ua/D4oSPHhLL5WJnRYyfDhpBYhClv4t+zBw+l889YWLl6Azx+8PX/+DGAlRw4bDwzsnvlpsVdmZQhlICsP8f8zRrZsn3P+g3bxEYgREVFw+PxE6fZ9LtMhTzByCxrz156/a19N2pkiDx6/HTYqEnQGsvdspUe/Jr1WyDlzt0HJJszfNK8eEmvE/pcugJVmJF79B60ftOO78LlR6KqABFLu5prN+zs1K3/d6r1XaxxYlmeNZuWAxoZQYxPMozcpG3fJm36QmTh4hWvXr8h+cr+s/vQixevLvpcqdOw7cNHT74L+oPHhi17ahSjmUpMw+2791g7EK9Uux2bA7d2005m5Gp1W0+btejly1cHD58Qp0+AkU+fOQ+JPfqNFI1sZqOZzfadumwnPPp+9J88bcGJU2devnoNg2jRyJ9jYq7duAUVL1+79ez5C/ivWSNbt+9xrkgnREMoVqZWzoIeEDlx6iwhGaOio588fWZZoppo5Lv3HsEBsDHyd8HIELlz9z7LZUaGlH0HjkDk8pXrEIfjgfj9B48cPerHxHx59PiJo3s9ZmShJ8oEB4fC0Hjdxn8g5YIPFTdrHI2MIOmUZBiZD2yMDKF6Hc1tFGkq3Lx55zu9KyTOcBiDgSHJRg4Pj/zzyRlydhbyo6h0d686PIp/ahgRkVFHj59h4wIMKR8cnjx7yT8LRjEyhnQYkmZk4pOclYiRlGEJ/wSt27STvwqHpALhEXE+I3+UkXsPHCtPihv8/QPlSfqFmJgYIrmbA8JH4eyBGGS5eoZ/du2NiNDc4ZJwIMRcnqR3kJ6jX7Nh+/v3mnPxYvjoFyBL+VEhCUae/fQcJwXkR5L30oq4z1EUbwok1ZA+F8kw8s5ddNYB89qJU+dYZNmK9Q2a09vbYPPgYXq9CyJPn78M+hTMCmQsVJkQa4h4L19bv1nX3gPGsDJs/QcIwcEhLMLKW9i4i3FppIhz49Nnzoubz1+8Zs2ev0jvGLx58w4xcyfEjJhXgk3/gKARf02GR9ZC9OfPX75+ZXVXrNogVbMwtQOCyfqN21i6Y/mGbTvRC26Dho178fL1nr0HRSPbu9VfumI9a5OQXCzCsh48fJypQIWpMxewy5LHjp9eunwtIaX/PXqSlbl89YZHteYsfvPWPRZ59vwVi5BsmgkksLl42Trfj/6v37x1cGtw6fI1VsA/ILBrH83JdND38FEThcJO795/YBVTLSTByLwRkB9OpGRoRjLb8ZpAUo1J0+aLz0UyjAyhVcf+fv50VgMEvwD5YPblq9csArnuVVvGfKHOjfnyZfDw8WIZMPKBIyf9/APFCRUsbN2xlw0DrcvWUxbRSJkJCIJbpYYsJSREsybGhIl0/aCnz15On+PNUiAu1KCT27bs2Dd1+hzW4PpN9AIaPWD/gKPH/wNrR0Rqx7xsF/D47X//27hlz9evX2vUbSGOWIm56+49+0Qjf/32jWS0u3HzLqvSb8BwoTdKs9y79zRzSx4+fsYi3+nCF7fhn712405UVPTSFXRmCBQbM3EWVOw3eNyBQ/QzLDw8IixMu+jdjNkL3n/4+OoVnbAh9oCwo7IsDoc3ZNhfYHPQdKv2fcSKqRP0NfLnyBheB8gP58KHp+JzxDsCSU3+UDiJz0XyjPz4yXNw1YLFKwmxZSlLl6/r3J0u9POQTkPW6IPJVB1OJ359jvlSqUZziKxcs6lTtwFsjOwf+MnJox4rHBxCpwAPHzUBHoV1Mxxev3kH8WMnzjRp0fnhI43dJk+bJ65E8V3YxdETZ4VIUV/BvEePnxZ2Wxjiu/YeEY0slHFo1aFvZGR0WJi6bqP2nyX/+/jJc1hrk6bO3XvgX4jvO3hskzCD4sjRU2BbqZHBquzUxItXb0jGkkFBwRCfPU/zkQCqrVmv9elzl9jmd+HfJBntQ0LDYmK+gEa9NUZ+xDrK96Pf9Ru3v1MjR969R9fr+E6XIoIxe2GdRrZxrMXiW7bvIVlLQeTKtdtQYOfuQyw9dQIa+efm/LuH4nPEOwJJTUwKuojPRfKMnAYDGwInOzDldes1RJ4RfwgQ1qJjg/F0GNDIPzdo5LTDL2lkDKkc0Mg/N2jktAMaGYPhAY38c4NGTjugkTEYHtDIPzdo5LQDGhmD4QGN/HPzcxrZvUDxSkU8WjrUG2Bftz/gQBkQC00B7Gr1tnZpovh5FoBFI2MwPBjHyLm7tCdXlxEf7xwT+5PLS8mVZeSSd65+XWnWkO4m3TpAxKRLO5O2bfi6iCH8REZWWDuXqN4dVFuyRs+C9tX0Ua3CxrVwmXpM00UrdVDauvNl0g5oZAyGB+MYGfxr0qEtRKiRL3iBmrVG7tPZpHM7IWsAK4MYkbRvZGunhmDh4lU6G+5TVbGKYGf7ugP0sXnqg0bGYHgwkpGRH0RaNrK1UyNwseEi5ilUqia0rCpeic/6gaCRMRge0Mg/N2nTyKqiFcCYiiLGd7EUq3IN7Ov0TzvjZTQyBsMDGvnnJq0ZuXCZutTFNq58VgqhKlbRvk4/pe2P9zIaGYPhAY38c5OmjAwuLly6Np8eL7bu4O6CJavYujYrXrVriWrdilXpbO3cWEmv6YFhkzDELlG9O3wY8OmpCRoZg+EBjfxzk0aMDAKlA1UuXQe27rbuLekUtzr99MGh7oCCdlXljeiiUOla9LQ1l55qoJExGB7QyD83acHI9rX7Wjs15NOlKGzd6SxjTrhJQp8JG3a1+iRaJoVAI2MwPKCRf25+uJGpJRM+vVC0vOEulpHw1Tz7Ov0LlPgB0zDQyBgMD2jkn5sfa2S7Ov0KlKzCp2swxrg4PopX7iTfnYQS1bol7Yy2MUAjYzA8oJF/bn6gkWEomsD5Ad6hCaK5czqpBi9RvTu/awYMk+1q9+XTUw40MgbDAxr55+ZHGRlUqIhHxwpbepUvYRzq9i9SsW2Ck+Ro48WrdObrypuqN4Crq0FV3LNAicp8egqBRsZgeEAj/9z8ECM7xH8fs12tPrw0RUrW6JmgheNFYe2S8PDZqmx9vhZg696yUGqdvkAjYzA8oJF/blLfyDauTQs56nacfd0BvCs1GGdeWkIXCVXFKnDlKcI6GMn5GEgqaGQMhgc08s9N6hvZPp6Ts3Y1e/GWZC42uhDlu4ilQAndlxnt9ZwrbRhoZAyGBzTyz00qGzm+oW58Q9eUO2NgV7M3vzugaMX2fGGgRNWufKJxQSNjMDwYychXliqt3bOuHJfhxHyIKM1cINEyh7vS1gPIPW0gK6Yk5WiKjUe2deNh07RjK6WVOy2Zyx1qZTi5QNOajzdsZtw/U2xZWdhNvkcZ5xarSBl5IuPMImVeejyGoyIOfKJenF5kWqMBRJQFXH9fPVaeawCpaeQi5Vspi5bn02HUzJvRPrFZw4ZT0L4av9P49luiercEZoYYBTQyBsOD8YxcxCPrqnH0pVmA2tOsYwuI/7Zl0m9bJkOEnFiQZedUiGQ8MT/HzCE0xcfbtFNrELTJhD6waV6+lrY1MDKUFIxs1rAhlTiUj7vHzHtmkEve5MIStpnh5PyMR+dqciHRxzvLlsli4Sxb/tZmXViSlWVd8s66aZKsWZq7YSI5v1gsrIlc9Mq2dRL9YIhNybRXOIDY3ExHZrPNjP9qDiPD2UWZd01jifAvmNZpRNN9vIlP3D0aRuoZWZhcLE8UFpXnnWifKmcJlOxWQG7X8e1d5/EbETQyBsODMY3MyNeDrk+vLOQGY1uWC4lmteorbMqrcjmJKTnH9qFGjq2lsRtDNLIPLfmbIPpcc4eIBVSWLtC4RTl60pBcprv+Y/7wTPtngfjIJbqZp0cH2mwGZwvPGjRRGGhnODRbSZwhPW/Xdlm3Cp8TkG7jblahtqbly0tVxI5cXaa0dFURR3PP2qAhdrQZj8/P16cDFDYZ2cPCtZrS3CXrP/QDhh0hpFtmp6dKc4+lny7QrJlbLRUpkvHgbPEILVyqk1MLwem/rxlLf2YF4Lsx6aSakXXqjC1nIUdXyZRD9zHokjKULFZJeGGkDEkw8oVF8iQMGIRgVCMXdlOaUzGBXpXEiUaEXPpinT3YslZtzckHJtxj85iRMx2aResKI2vqZSDWyNnXUherSFlawEbjd9qgrYdl+erkAm2Z+U6V1YmSzYltgihV+ZxpxexUwSzLvHMLamThGMwa0QXGWLqKlNK0DPtVuiozu8DHiSpTOZmRs22bzOoqTZxzTh7A0smVZfCYr2ObjMfmsiMU9u5tYVJBaeWeb0hntimOkZmRaUcJ6eJ/lGxSzcg6b4HTefqYL5Y4RT0UJSsq7CoqSuieL5EwOsfpxat24Uva14138rLh6G9kDBjiC8Y0ctaV45hMlaYubKzKziPTUaoPtS1NsRbO5Qmnj9lZC4jk60GvxlC75XKmWbFGhrEqyCvHhnEmE+n1fXEcna9fR9pIQcFrgoItPWvk791OScqx/YpGzj22Nz2wNeNVOZwyHplLjaxypY2cXSykTwAj569YnzWbeQcd9mYQBraqzOVM+9PxFPs8ACNn2TUNIgpSNufsIXDY5vXoBFgiKJg3Mj2kEp6K0nR1Bbpp4w6Wp73Exsh8ByaX1DFyyeo9+EQrp0a8BxX6r1Ns427uWj0BLMrqnjihk4J2VXUcDHdCGVIsreiHdEqARsZgeDCSkeMDHCr7eg6b0hMUyQJGtRbWnuI5AZp4KcHzAPFl8en80co2xbPAfF0ZfF2+jMGkhpFt3UvW6ClP1DUFjTegTsxdqvH+TQBFcR2XE3l0XmDUUSzFTqqgkTEYHlLYyCmEj7fC2kNp7pptzTh5VjojFYxcvEoXfuRbuEw9uf70Mx0vXD3hm+KRH5KuMbtVYguHJhvjGnnFthN7jl5etP7Iiq0nPsd8Wbj+iPemY5A+f+3hL1+/nrxwZ+7qQ5AFKZB17uqD8IioLfvOsQL/b+9M4KMosj/eOYEQcs0kc/SEQA7AQIAIySQB5D6MJ3LIoSCiHG6QBRQUUEQ5FMKVmINDDhdUFG/uMwIh4fx76+6qrLLrLqvuenGpC//3qnp6Zqp6JpPMTC7rfX6f/nRXv6ruzmS+XVP96jUtB3t5R/kza96GlWXrdzz38iFYWblxV/5z2+nepeu27z38LqwcqviAlgirc2uYRBayqRaIrIlann1VxpaZOvXiOVst8W0yapk2gD0xrZNP889osjdEvnr16uUrv1LRkoJNu8sqPyravCd/HQL086/+BctzX3/z4adfbnqt7OCxD1Zt3LV26wEoLKv88J3jH8EKMBqWhZt203LSyK7ffvsfXd9+8PTFS1dg5dJlXJa8sA+W+46+B8uXth/7+z+/pW7C6tYaCJErSNyYbbPF+tnh6+ewPjVV+AbSVEWx/o4h4cWPwGYwDYV2qyA12I5pyhfP6zyXv4mc0HFgfCqbrCcpaygDvtbX38TXdZQhk8Wrouv7RM2ZIJ0sxXGnCjLGtX+FfsQw1s0mc9sqRjBYImt1k1P73Vfl/aMG8obIroz2XssqPvjhp4v7CT3Pnjt/5oPPP/7ruYPH3j907H0oKT/1CcXuW/tP0Cq0HOzU+38FwcqJd//y2//Q58iJj7/46jzde+TERx/95csLFy/D+gHSuLA6t7ojsidhuTYfmTz3U8vlVlnm1t0YH82K2ptE2CbuKtYPvBUfvrXC+SzAWdhsWjrbTUVat9lqm4+q8mexTf+MF7uSv4ms2Z3kqcf7OMqY3ptnq6FTb/vfqrJYOrVake2W1mTLfE2O8+07io+7SO3PPpY0J2Zqho54KX8QWdjvzXxEZBpZkYCdkdhhQyJmTbTEZEiEXE2KHzWlYSfLFIRRZbQQYw/oks7+qCiOHXaH3DLLEtYVIxZI+ITcEgPpzFKmIac/biZiDAY9HCVywIGVUG7ogC9hs3+3SZyDJQqfpwdvW6ibjFEcxsQb0IeEzZnbdJOjM/XjRyptkggQAAFuwspJjGYLz58uHUG8WnTYDlS0GDEC2hKPsR/Bu/PROSkHfOhBDbfbhybx5GMzZbMVrsVstEfs+Un+JjK+JMm5hEdeyw7uKKmB44y+9PNq+txc5T+BE/z1lBk3O5ey1QHKbnu4ntwwNEczvJQgsjDvzTdEjpmM4WgSoS1PZFiacvrFDcIfthR5yM2OPTD0jW6SZVzuLbG5JKSMxNIhK2My1Xb4PrLcLANaoM3GTRxBd8UNH0zPBPFNAoHNqT2UQ8NtA24AUhelEZubcj5ylnrDACLLUlf90CHooEzMK4q5ewS95VAfxz4yXmBWX8f46Fj1Wri/lW/lVyJDX5J/62gql1GIr+gonqd45hVF8OHyzoz0Q/AjCNydzzfCO6tK6T6SOUP+RSeCyMLqp/mGyOGrH4H/SOn0GpkQucVjD8itswN3YV8SiZycox9zJ6LtJFIVPU+UmoHI0B0mMyyQyMnZgTuWYtfpBMaxYSH0W6Mz7EQ+s0Y9HCWyOb0ntgDNHlql9pFbPI6AgEKLlG6UsuR4q1mXhT4HMWkGnImxW3+lEXArd0lkY3Y/Et1cTDpreD5N18yOmWi/8YSVPKKeD/agDdYWy6bjXnrylSV4sadXqz5+kl+J3K7PvXxv1JMeqCpTp54sjskkIN7TpVpgTpKQbQs9JzJO+HY+Q/5lIq0638jW8lqCyMK8N98QGRSxbFrshFEyITJsGnJvCdiZr3tqcvDLC6FDpH9oXNyttyKnjhVBIWBLt/ABXKksoZsSpsIYHjdc6ZbSQv38SSAo0U+7J27EEHXUQv/UZHQA/q6YYRh0c+gGzFukKnBHvmHATVGL8uimbu4Ew023NF2Dj++gYvTTON0O1HTdnLjhd0Cb2FRFke7JyXrSJmw22YL5LmKemGTon9uUJAZqsuHxuNtvw9NG5+KI5dPjbr894J0C9aB4enQvEOdEadyooXgtXkdeVym/ElmzI8nArk2P0byPKhbHJKCbd6tCcVa4UviUPYcyP5mQceAf93kvQWRh3pvPiEwl24gsVDuqZSLzb2xyk/vY5DyCrBt8B5yw2cJ2uj1R2Aa8L7JE5vrvqtr1vdc9kUGt06uID6muBJGFeW8+JrKr4AQhP8mvROYf61na9qiSdKoYgOJPnKP4vFRTFkOmRUqnGT80BRerGzvCsUFj1768GxWffoj3aT+IvTovJYgszHvzNZGFald+JTL/8ro2PUY5k47tRDvKicjX95HwAYBGrzZq1v1OF1VRTPNVMTIOuBF2MZTn3RRxQ8l8X979yddAgsjCvLc6ILJhIP5aDH5lIb/LjfDx4KBbYSXu7mFqT9yiz5AOk1zGjp4koErZrCzG1J3kC9N8LUZHyHH2R/x0/JqmqYP27RmWHRS4M98xzKNaosFzjs8AfS5/EjmbD1GAfmWVfU8q83XdHdGpmzRa84FezNRx9sspf3ba2aMgWLdEkA/FUSS5K5DdIyJz4938W/j4MRkvJYgszHvzHZEri8PWzA60vQck4OBK9WUZQfuWBx5cGbwnHwN44XdrQlZ46SxaBWPISFRv4KGV4NZ0A+apgBXctRafxQXvWBK4fwU6HFgBjYRsxrzGQaREeqcgrHR2AAmisItM05BJtk+JRGWQzHPFEYseNHe4AUviMk1Z2F+jkqU0mQRdmGWSns35ouDQ2NShVRK9iv0r8AIriptteLzp5vn44K7C6WxplWals/EXOjmT8MV/xPKjz4aVPiqV4ZNA8AeFblvAHKtm8h+RzcnZ/BtDGMy1HzCRr0hlSneaMy1VlsBHzLqRzH+qphAcg6afLVdi0p0FPoYkp+AN3kcVc6p8f18QWVg9NN8QOeStp2UCQUtEBuarfDIPo9/IDI6w5TNoGG/0BExuGbhvOXR2YqbcE/LGYtikszz0U8foZo6HleYrZ0rk8aA5NpMm29SNHyXTgDPSR454BLNrhj8zDVmZTELNErJCt9m723JkhiWoiyUyQzZg1BS2MG0c9pTDM0Do79hHBofEbIsePTUVtnImHi5/Ou3f6YdjvIf+5tsDdy9rRnI30+g9Y1pPRH9STuSaWRiQd2p1CNx+SMLPmPF30ThlvFKMhk43k6z5zVc8TOPA+INWS34kclIWn8sNfuk7Yo6fDqfKYHVK8AZXqr97OOOjv0eJIqcKryylRM55d6tEPjtG6FPwsBOR27A+qhgiJ+ewRxdEFlYPzTdEjhmHIVC4ThBj7tTTTCZiQKGx90CApllSMibjKGG8NWzjY6acvrSLJJutsnQ9ENlCGEprBe5bEdcz19zSFt5rI3LQa4h+6JlGTUWCW6QuIENKL+VM6O9i8voSdKObEnlxSVkBlhAiO/WR4egkWXPoS0+aqSfp+dodCHZpUzT8DqhqMVtjHsI3aSrx1CdKDZn95Xhsx3i98riJVmm+8uGItY/QS8MnV7IViUx+gMsWMt+knP1jVkt+JjI39uocVeaOyFn9GSKbbmNjG6IKZ7BXhG/SUoah+DahMGz9XGcis714VQyRU3LuZB0EkYXVP/MNkZGzyeQdIik5IdBjpSiMJ8SBdSRyBkNkLIcqFvzOSydLkciRGepX0RWRlenOrbJoWCtNJ4+TSkhFYzKZLV2JKZhhxdSlT8BBh1/KOgxrdewjB+xbge2Tmdwg3biR9HCh6+xJPnFXojKxWyFyUjayNYFA35nITbfMk/GsOhJnrAtEVhqhV3pwFRKZGx6psfxI5OQsHLhwLmQwp5k3mcqQwfaRW8xlp2lYpM78Fani24TCqCn3OhGZ81HFnGpS5h2sgyCysPpnPiIyVQ1ytHviw8jxx76H1XFigtvxATJzga7rHrhLOubszI8t8CWO0jwrzUKv5T8iy8nZlrY9mEImK3z7gTiIpClTR6cB38C3l0hHcBiHkavPhU74ZJ3hpis7PTDkfVQxRE7gUgsJIgurh+ZTIjcKhT9jf8Vq/ZcfiZySw6cQaj/QOdbCLdQc0Rk78Gb8ecT5yGHKy3CdpOkZiyM/TNeb9XEQQ2RTov23keLg9uRrIEFkYd6bIHLDll+JnNJtBFPSqnMuQzq+lipHdBpIgiFjBzacjipiLs5NxyuqLDbdQFL9cQooWyWdKGHa5N2o+LmF/AS/DlyyCy8liCzMe6tTIrv/7e9aUaumR62sRk82qmB62JZ5muU0Ig0U1ycXfinzPo4KeXMxVuHKq6Wgqo6CwvTtXKGW/EpkT5Ij8w6qWCLTbHycm0dqjSPvhg5O07JNHfHFspqytLuhyvO8ri8+m/WhBJGFeW++JjLPERclQfuWy2RksAbCSR8Btl+7LgYiHRUzekT4UhvBmTiKPRi2HPT2Eqe4ZjbhvXKI5kUkxR2713lTUzYfuWVWk00a9wZnZxLX4dntyq9E1vpdz86Fi7+OfcOIKnPbbk5QTusNJxw5y+XDQDeiHwGDeN5NlScpQ+O5RKNeShBZmPfmGyIrz2Fo9nEjhlhYdJmULBiWkJJjTO2pPNgh8Ri4iwQpw161ESw/VhR7950yFJIYBuoctuJhxYf2sMwkJCugawBhelxn/GYqKZWPl5jTe1nMmeYw4mOyyjE4+AjrulnjMTAjGWPjnI64Z3nI5vmwYiJhwliYTC6EiMZLmMLxukxJ3RkiN1k3V8ac+l2wkER3mOnEMCMGdSiHCOtKw5ChtVASgo2RG+VFcqQVA65hV3gGDQih6ZsNA3JpwDLGk3B/Z17+JbLW73qGdJr9aFUMQ2PuG41/E/IX81wKjtOdZusZM9zxlDlJzQnTPk//JogszHvzJZEplXQPjg0A+JKQ2+AdS8yEyBZjJiUyfiGTs0O2Lgjaz/aR6aYjkWmh8c7bFJ/jJbZIXisQWQ7FjPVGI0Iw7v47DTfeHDMXp5AF7F4Gy7CtTyptksA1hcgk9NjpiHuWw7mZ2vSg7UinMboO8xqfWYNEhu7zjqUWMq8PDsoQGe4NpjY30IrhTyKYop+Zgn8EUlFRRbFu6FAl1T3cURKzsY9sS8pMg/kYItefPnJi5mCNSSJVJbp0UhvnbrK1XyjJdGo2sqO6rtSs9FHwN6Swb03lPVXxaYba9sTZSY7iw5O9lyCyMO/ND0SeOT7gcAGgJ3AXkhGz0esznYichESmE5RpDnsqmbyYQzZkuiOyDZpAZHOXXkrG+v0YVkz3KrNOgNSd+yj+jn1kk733SsuByOaADP3dd2ILZThbGgpNvQeYu5J0+GWr0AcQGZGhQeTQjJjxo0jFAorRyGV/xBUHIkNh9MK8sOewN02J3HQjZnPGzaPPRs0ht5BDeJTglxfC0k7kUx5lu/crkQFtSVlDmcK2PcdwRHaHV4akBpq0/lhR6Da8XneKV34lxGUO4BthnR3U3jlEr4NmmiGNARlvJYgszHvzDZGBKdGFMwAlsAzbPA9Yg5vHiqIXT9HljW26+QncLLcVFs4I3I05fXRT74lZrOSVB7UofEg3494mry+KXjkNvrSqc+Q67CVRReb/EQAXtWp69Cp8wha2dnbs4MEhLz1F94Jz8PYlyvrSB/XjRtIfvFDefMu86FXTop2fy+EhCIVjnpgcO2JoEH0F9aFVcP7YeyVgjVo6Fa4i+NVF4Bz6xmJ6VqpiHp8UO3JY4PaltLWmry4AXjv6BL35DCaMPlmKhUCisoLYUcOx/WNF+vGjdHMnULeop6fEzJsEpxdBMn7A7wxd3hjHA7mSX4ksa5KLS6uW6jq7BRXPU0O7nvSjgV8GxrQ+dI6lonirbspYJXwbp95wdd3iWPZsyMJNRo4ay3Mi/+mNI3TljX0njpz8GFauXr22ZO3btDD/ue1/O6e8Lpq3LW8eheXeI+8Vb967+sX9dH31Swfo3kWlb8Ly2//8CEtoZMk6bPPoqU9g+clnf6c+a4hzKakLtum1d2D55T+++fd3P8DK6hdxb/GWfddIy9TnL2e/pitwxMI/7aHrwvxhviFyY5I6qU8/1inrQv2Uv4lMUiSzXeA0jYEL1ocRT1VQxOxJLgdnKoqZyAoPccxHWfDd/PjU3j4fRJarQ+SC53er69//8DMs89dtvwpUvnbth58uwnLf0fdVB8aKt+y9Qhpf9tyOo6c+hZWdh858/8OFP3+B0Hx1VwUsvyFs3X34XVj+89//Kav8EHD/4Z+/oi2s2rjrGjki3QRAr9y484tz589/i7Ve33v8t/9dhbsCrD//+uHX9hyHlQ9sdctPf3ry/c/oujB/mCByw5a/iWxOymrXayxfyPZD+a40J56tdmX2M6b2NLbpaUhjx4udlKUdquwo9sS0hrk9OdsayHMiFz6/+/SHn8MK9HOXEfate/ng+5/8bWfZGVh/9+OzS0nf1pUtX7/zGiHymQ+/uHjpChAZNs+eO3/h0pWz5/59+MTHlMhLbRQGIsPSkcigZ9a8RTdpl1kl8q6yMwBoIDhsXr78y9Yd5VC449BpesL/99EXpz/AFWF+skZEZP9MU662oNNX4zMh7yGslvxNZNkFv6r3fI8q2S2UPRDbICc+6I1/gof3mN738HW9l+dEFibMldUNkeHfV82kzOp4CR3ADX1lgecZeXRjR8b1GBQ7erjs8OSNEewKewUDMHjpp+FX1KmQPFo0JzgX2mSOtioJ4TBCzv672zGuq1pctkjpliiSLNSWbslD1QKRW6fnmlqTgDwHmRMzPemN8jJkOk2D9lCmNMwh5V4enlL7AZP8MWQhCyIL84X5hsgYa5GYbWqJcWCBezDEIu6OwRISSvkmB7/5tHT0WUu8FSAbuQD7XJg9OTDDIl0PAKUp3DDEgkRiwLqlSRcgsqWllcYnmDrhNIQWi6Zi5EYKxhRb4jKD99le+UGDE46XMEQOI6ERIHMUkh1WdFPxB3jz4pmwGTt8CO5tlSWVaxDZYsoM2boAC0mfF86hxZJpsNl00zwD7azRhHCJdiIbht5GTwM3j5fCaQTsXa7EaJPcpDEzlEligTvzg7ctssRkWGSrnIy3H4vU2RKBc17AP/ht8oDRM9UCkWVX3WTnXMmg6/piilRPZOzqFFzsRqb2bLYjV+JxrPn4rsrnkDWWILIw7813RLbFmZljrGEFM2nkb8DhQmRoSwQofeslfZIDK8ZMzCMM66asvtjTJJFqkQ/fH/jWEiwvJ33k1sg73CwrwBhkXaY5LhsRRpztRCaYhhW2j3ykUKosaVbyKC2EpaFzn+C3niGbCsQtUidZtrJEVnJvEog/MIZutnh6Kl4IcJNkoEfy0qTJlSVNNs0DmdshO+jVyTj5JQ1OIOS1xQE0hA4aaZVlTu0eeGAFVAx+dRGtC0wP2rkU70kkcb5Fn2mK7mY/k6pUO0RulZ7L54UwJ1p5CCakVT3Ua2+hbTdXXWZjhsu3mmqqPTde0UGrg9yyfV/+QnwlQWRh3ptPiewcj0xBhjM+zFkYj0yJTPzxP5h8MZCMTTCDe8ycCaCoBXmBby+lbk5EriymzDK17EZTHGBfUiXyQYI8lcgnMDYZq8RkGDv0lt4hcdCknfDVj9I0zcGv4vQ5etCY2RMYIsfecjueIVWSLUfzydWW6AwQPX97GvsTpTRxftR07CFilxmOZbLivBKpi5ycE0rmBOIY8fGSmMcnYq/ZmKkQGZoyWsOWzrATuXlXGVDO/YVdqXaILLvoWrKp4IiA1LynX5XSfSR/GpZ2GgMdmpj2lQSRhXlv/iQyzVvfOhunciRkMUQOPLAydOtTSq2ELOAUvmijAnMfY62oDE0iQ11zuNXYE99Lwo5aVBZTIlNFTx+PmeOTsuNG4eiE0gd/DKcFRy56ENtpqUz7Dtyd70RkJRd+R7wu8tIpZbqKM5HVNh3HkePusgVaSV2glrEP5uSFu5FM3upkkpUXXkQuyKNEpicg4aiFcnXwdwumYdGeqdaIzOeBo+JRCErMHMx7+kn80TtoRbzJmFpovDkRPws/SRBZmPfmGyLXmuLuGwEUCy2dA18AHJSwlQNAm73wBO9fb6X2kZ1EO92csxvVGpFl1x1MHogdtKbJ+UNtbriLP7TmqDfm59Qq96EEkYV5bw2MyKCQ5+dHzZscQHK22VVRHPXYRN65/upwYdCri5nCyCVT6Zu5PVdtElkzNhmU0GkQy0Si5Gz7TxZ/iD8iFe+Jzn7GsSyILMwX1vCILOSo2iQyKLHLLZpPxqBHzJORyh+hZpa2PfgDucFxq06D+JRJPpcgsjDvrV4SuazA0HOQPm9M6Ob5sBK1BId9XSnkRSWphUsdL9EteIDGePDSPTVZN09JLmEvnDcRynnnsLWz+UJHNdmMIydQN3rBHyTMYzecRgH6T7VMZJkEvfGFsltKtu05hvevobisGo7SnMwNtwT3KUN9JUFkYd6bT4nsmDweQw7c7nVdHRMH6zIxpWdKjjGtt1TusorFkClH4wMxzXaUdRobZ3tfNXNWkdPui/rDPUwLUXnjIqeNZ1qzSGmGMUPtbmo7qkNUBk33HDVtfMTMCcrzRpJUyH+qfSJDd7j9oMl8uUyyd/KUVBWfqv1KJ8/VfuAkvllVvD+Vq1uIz+UlkStPnCkq3XSs8hS7Q9jvyXxDZBrkizMygI8VRXK8VW7eVZZxPohEIxNIcq+YcaNbFDyMs2m7DZBJ0AJV2Dp8Ume6jsTz0lz1KTmBW57EFTIpDlei8Sk50NkskUdG8UrwBhba3swUMwffTxHb/2bSToksdUWHZOJDUtrLrUkfCpY0YTGhv0XqGHfTLbRNLKwoxiBlixVTg6bkhC97CC+KpvpMymnywnyaaR7gG/H4ZLyW7gOxFnVIydHfeKvcOsuU0sMidYZNOu/Df6p9IqOgo+pqWJbs4nFpF1ZUYk48UnJ2u95j2Uac1V4rsz5VreFYrimRJSmebwokSQmsq7DfgfmGyAocgXRSZ9w8uEqWrqcUlpTo3RJz114WqX3QboyTA6gZk29Qq+NrQZJzjAb8okatmIZT8sgkN9iMmX5v8J58SnZTdl9onxJZqWixOvWRK4qj5v/BEoxTmfEm0TobOtpKjBohctiL88NLHpENJM6MYtSByLQwcPcySmTpUAG9KFMUnVaXTvvIUCVi7gPkcEX6EcPoO02ko4XQLO0jUyIrfWStrr0PVTdEBiVlJXTC2D5NXddvPM9NTnnteo1N6DgQ45cdxqbNyVnm5OzWXW5Ou+lBroqGoAX+BKigT605juEn1YDIca2riEhhKwhr7OYbIhvDulua2Caz0ejddwrp3GjJxj5zRm8gcrzU0hLSRZm1Ycv8YMjqD0QGWAMcg95ewhCZIjV8xUMy4SwS2ZYSHkN9yXw/ZTM6QzZaA0gQMXgiWM1WLLQRudkrT4WvfkSJ/GWITFPdOxDZLGVYmtln6GF0syUr+I2noUrIXgyFlqUucb1ym75AJoDAPSkC32kSMf1+JyIr9wN7Yn7fqs6IjDktexHkseVUmB/OfWfZa7k5ukyCK/zxUNGNqktkx7qS1O6Lv52Dwi/PfS1JbR13sdWENWrzDZFB4evn6IcNCSK520O2LYyZPh6Q1GLTXOhIkmVxi+cfi1iPT8Yiimbqxo7ExPAO1ZtteQIKaSb7iE1zIzbMgRWo2HTbQlgJ2LNcd9edzchzsxYb5mKDtOLRZ/UjhgfYRi3wId49o5q9MB9aaPLKAijRjcaXgygnsGlu8P7lwTuXRmzE6rQQj7V+dtiWebRNWAa8UwBHpz4RJbP0w4cG7F+BjVcWQ2vBe5dBlcDD5IikJGDfCqjVbOuT0Jpu5PDwTY+BAyztFw5LF88VvVcdElkmk5JdjSkrDmn9eJL6RO7jnaEDXss4lqtJZElqpVZ89/2PmL3vvvehuleS2jB7hTVi8xmRhepEdUtkmWS3qDLBUErOcB6pNVRunqVtFbmHXI5x+1nVIrJa62AZJiAG++HXy2v/8d6Pv12hm/sOHFZ97NWENXYTRG7YqnMiozAiLa/KgF/otOIUuxoOZeS5GbZWldj1NjdP+fytmhGZbkpHSXLa8sK//vytdHSFUhjVifr0yx1prymsUZsgcsNWvSAyUWq/+zGzGleuoeTsVum5qf0ncNh1UlpuXrs+91raYopXTwSs94Ta/pPnRN65az+tEmxIh81zV36mn+bPV3+7RuhM3Vqn30TdJKmdY3VhjdgEkRu26g+RQUnWIUBSzUl97oXxFUlWoqyaVE+y4khF9Sv6Vp4T+bXX36JVJCkONmd9vFP5QMsLT/50HlZWfoZvI316mRJSKUlJbBPCGqkJIjds1SsiU+E8ERzJrQ0+ktnbeXKb6gQ4+02eE7m84iStYkrKhs1frl1lPlbqJkkSdZPCOzvVF9Z4TRC5YaseEpmq/SBMnezXgIe03Dxfzs/2Wp4T+ZrGOLJD6FF5IS002Xr9K4vW22sKa9QmiNywVW+JjErOTh0wMbX/BPeRatVWcnZa7pTk7GFseV2rZkQuXr2Rlhz75nPp1IYT356lm6ueXaf6qLWENXoTRG7YqtdEtgmInNrvPsBoYsZtNRvthRba9BgNnW5MnF+jFmpB1SLysNH26S2SFM7sVccrQMPvmsTsFdaITRC5YatBENlR7XqNwQC4QQ+0ueEuuU03HNZgCYuvUgTFt++T2v9+Gi2XmDG4yui6Ole1iAwWYcHZpKokKVGKzYClYyH4sNWENWoTRG7YanBEdlY2dH4tbXu07NCvVecbW6XflNBpEAmh61b/+curukS+hn3hQL4dVZKUylYQ1thNELlhq4ETuVGpBkQGqzh+RpeQyTSlb2UtrxBpOX+PJojcsCWIXH9UMyKr9tW5f3z22RewZHcI+z2ZIHLDliBy/ZGXRBYm7JogckOXIHL9kSCyMO9NELlhSxC5/kgQWZj35imRL124zONAqM716X+/UT8jnhFCtSlJaqV+Fv/89kf2qyZMmAf2/Y8XePxqEBlLywt5IgjVrRw/oND4ejp14neiiuNn1M/iX98JIgurtl29epUHL7KXLwJdFN3keqadX//Z8QO6cPEyjwmh2pEUmsZ8X9hvmzBhVdn5737kwfuTKyKDLly4JJXbXqEkVKd677t/8R8QfnhSEs8LIb+qe987+A8C9NX579nvnDBhWnbh0i8//qwxXqF8qfkiR126cPnKxV+E6kqXL1zhPxRHXbh46covv1755Tchf+vylV/5v7+jfv754rf//ekbISHX0hw7dlQVRBYSEhISqjUJIgsJCQnVFwkiCwkJCdUXCSILCQkJ1RcJIgsJCQnVFwkiCwkJCdUX/T+oYpQpX9fHWgAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,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>