export interface Section { heading: string; columns: string[]; rows: string[][] }
type DocumentStyle = "house" | "market" | "farm" | "wholesale" | "receipt";
type DocumentKind = keyof typeof workflows;
export interface Document {
  id: string; kind: DocumentKind; title: string; date: string; issuer: string; recipient: string;
  sections: Section[]; notes: string[]; workflow: string; style: DocumentStyle;
}
export interface ArticleSales { sold: number; gross: number }
export interface DaySales { date: string; open: boolean; articles: ReadonlyMap<string, ArticleSales> }
export const workflows = {
  identity: "Dans Paramètres, onglet Restaurant, revoir l'identité, les couverts de référence, les jours ouverts et la terrasse. Confirmer la commune depuis le bouton météo de Kookia.",
  suppliers: "Dans Paramètres, onglet Fournisseurs, renseigner les jours de livraison, le délai et l’heure limite indiqués.",
  catalog: "Stocks : rapprocher les produits, unités, prix et fournisseurs. Stock initial zéro seulement pour un dossier neuf sans stock préexistant ; ne jamais écraser le stock du compte.",
  recipes: "Dans Recettes, choisir « Importer une fiche CSV » et utiliser la fiche correspondante dans installation/recettes/. Associer les produits, puis renseigner un rendement de 10 portions et vérifier la date d'effet. Conserver les recettes inchangées à la reprise.",
  menu: "Dans Plus, ouvrir Services et carte. Choisir la date et le service. Vérifier les prix et associer chaque article vendu à une portion de la recette correspondante.",
  forecast: "Dans Services et carte, utiliser les quantités planifiées comme base d'un plan manuel à revoir par le chef. Elles intègrent déjà l'ajustement météo du dossier.",
  order: "Dans Mes commandes, ouvrir Préparer un achat. Vérifier les quantités avant validation. Le stock est crédité à la réception.",
  invoice: "Dans Mes commandes, ouvrir Factures & documents et rapprocher les références de commande et de livraison. Créditer le stock lors de la réception des quantités livrées.",
  delivery: "Dans Mes commandes, ouvrir Commandes & réceptions. Rapprocher les quantités livrées et vérifier les échéances proposées. Enregistrer chaque livraison une seule fois.",
  credit: "Dans Mes commandes, rapprocher l'avoir de la réception et de la facture, avec sa référence, son montant et son motif. L'avoir ne crédite pas le stock.",
  production: "Dans Recettes, choisir « Produire » le jour du service. Sélectionner Midi ou Soir et saisir le total préparé, compléments et invendus compris. Kookia déduit les ingrédients et enregistre la date de saisie. Garder les productions passées en attente si leurs dates doivent être conservées.",
  sales: "Dans Ventes, choisir une seule source par date et article. Dans Historique enregistré, utiliser « Attribuer à midi / soir » avec les quantités de ce bilan. Dans Services et carte, rapprocher les invendus conservés et écartés avant de clôturer.",
  ticket: "Dans Ventes, choisir « Transcrire un Ticket Z ». Vérifier les totaux par article pour la journée. Le CSV et les factures clients couvrent les mêmes ventes.",
  customer: "Justificatif d'une transaction déjà incluse dans le Z et le CSV. Ne pas ajouter ses quantités aux ventes ; pas d'import de comptabilité client.",
  waste: "Dans Stocks, ouvrir Lots et pertes. Déclarer les pertes brutes avant cuisine. Lier les parures, invendus et retours à la préparation correspondante. Ces déclarations liées n'entraînent aucune seconde déduction de stock. Les retours en équivalents-portions sont des estimations.",
  count: "Dans Stocks, choisir « Faire l’inventaire » après les opérations. Kookia date le comptage à la saisie. Appliquer chaque écart une seule fois.",
  lots: "Suivi documentaire des lots et échéances de travail. Kookia ne reçoit pas automatiquement ces lots. Les durées sont des hypothèses, pas des consignes sanitaires vérifiées.",
  service: "Dans Paramètres, vérifier les horaires habituels. Dans Ventes, utiliser Calendrier des services pour la journée et Services midi et soir pour chaque service. Confirmer la couverture après avoir rapproché et ventilé les ventes.",
  adjustment: "Stocks : régulariser l'écart signé par ajustement OU comptage final, jamais les deux. Mutation datée à la saisie dans Kookia.",
  refund: "Ventes : motif du remboursement sur l'article concerné, sans changer la quantité servie ni réintégrer les ingrédients. Montant et mode de remboursement documentaires.",
  kitchen: "Journal des décisions : préparations, compléments, substitutions et refus sont reliés au service. Les notes ne doivent pas déclencher une seconde production.",
  ledger: "Contrôle : initial + reçu - production brute - pertes brutes + écart = final. Les autres déchets sont des fractions de matière déjà sorties en production.",
};
export const labels: Record<DocumentKind, string> = {
  identity: "Établissement", suppliers: "Fournisseurs", catalog: "Produits", recipes: "Fiches techniques", menu: "Menus", forecast: "Prévisions",
  order: "Commandes", invoice: "Factures fournisseurs", delivery: "Livraisons", credit: "Avoirs", production: "Productions",
  adjustment: "Régularisations", refund: "Avoirs clients", kitchen: "Décisions cuisine",
  sales: "Bilans de service", ticket: "Tickets Z", customer: "Factures clients", waste: "Pertes et déchets", count: "Inventaires", service: "Services", ledger: "Journal matière", lots: "Lots et échéances",
};
export const workflowEntries = (Object.keys(workflows) as DocumentKind[]).map(kind => ({ kind, label: labels[kind], text: workflows[kind] }));

export type WriteDocument = (kind: DocumentKind, title: string, date: string, suffix: string, sections: Section[], notes?: string[],
  parties?: { issuer?: string; recipient?: string; style?: DocumentStyle }) => void;
export const section = (heading: string, columns: string[], rows: string[][]): Section => ({ heading, columns, rows });
export const serviceLabel = (service: "lunch" | "dinner") => service === "lunch" ? "Midi" : "Soir";
