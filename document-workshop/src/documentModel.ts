export interface Section { heading: string; columns: string[]; rows: string[][] }
export type DocumentStyle = "house" | "market" | "farm" | "wholesale" | "receipt";
export interface Document {
  id: string; kind: string; title: string; date: string; issuer: string; recipient: string;
  sections: Section[]; notes: string[]; workflow: string; style: DocumentStyle;
}
export const workflows = {
  identity: "Paramètres → Restaurant : reprendre l'identité et les couverts de référence après revue.",
  suppliers: "Fournisseurs : créer ou rapprocher les fiches. Les tournées et conditionnements sont des hypothèses de travail, aucun email n'est envoyé.",
  catalog: "Stocks : rapprocher les produits, unités, prix et fournisseurs. Stock initial zéro seulement pour un dossier neuf sans stock préexistant ; ne jamais écraser le stock du compte.",
  recipes: "Recettes : rendement 10 portions, dosages BRUTS de la fiche, date d'effet indiquée. Les parures sont incluses. Associer 1 article vendu à 1 portion ; ne pas recréer les recettes inchangées à chaque reprise.",
  menu: "Menu du jour : choix proposés pour chaque service, à revoir et valider par le chef. Aucune validation dans Kookia depuis l'atelier.",
  forecast: "Prévision de travail établie avant service. Elle ne constitue ni vente, ni production, ni prévision terrain qualifiée de Kookia.",
  order: "Achats : reprendre et vérifier la commande avant validation. Une commande en attente ou retardée ne crédite pas le stock.",
  invoice: "Factures : saisie manuelle et rapprochement des références commande/livraison. Sans OCR générique. La facture seule ne réceptionne rien ; utiliser les quantités réellement reçues.",
  delivery: "Achats → Réception : enregistrer une seule fois les quantités livrées, par commande OU par facture, jamais les deux. Une tournée retardée n'est pas une réception.",
  credit: "Avoir fournisseur à rapprocher de sa facture. Pas d'import de comptabilité fournisseur ; ne pas réceptionner l'avoir comme un achat.",
  production: "Recettes → Production : saisir les portions réellement préparées (initial + compléments), avec les dosages BRUTS de la fiche. Saisir chaque service OU le total par recette/jour, jamais les deux. Les invendus restent inclus dans cette production.",
  sales: "Ventes : CSV quotidien agrégé par article/jour, ou Ticket Z, ou saisie manuelle. Jamais additionner ces sources. Les prix, transactions et services détaillés restent documentaires ; CSV natif = date, article, quantité.",
  ticket: "Ventes → Ticket Z : transcription et revue manuelles, sans OCR automatique. Reprendre les totaux article/jour, pas une seconde fois les lignes des services ou factures clients.",
  customer: "Justificatif d'une transaction déjà incluse dans le Z et le CSV. Ne pas ajouter ses quantités aux ventes ; pas d'import de comptabilité client.",
  waste: "Stocks → Perte : saisir UNIQUEMENT les lignes marquées sortie stock (péremption/altération brute). Parures, invendus et retours d'assiette sont déjà inclus dans la production : aucune seconde déduction. Kookia date les pertes à la saisie.",
  count: "Stocks → Comptage : rapprocher le final après les opérations. Kookia date le comptage à la saisie ; un écart déjà ajusté ne doit pas être appliqué deux fois.",
  lots: "Suivi documentaire des lots et échéances de travail. Kookia ne reçoit pas automatiquement ces lots. Les durées sont des hypothèses, pas des consignes sanitaires vérifiées.",
  service: "Ventes → Calendrier : jours fermés explicitement indiqués. Revoir la couverture des journées ouvertes ; midi/soir sont agrégés à la journée dans le CSV actuel. Un jour hors dossier reste inconnu.",
  adjustment: "Stocks : régulariser l'écart signé par ajustement OU comptage final, jamais les deux. Mutation datée à la saisie dans Kookia.",
  refund: "Ventes : motif du remboursement sur l'article concerné, sans changer la quantité servie ni réintégrer les ingrédients. Montant et mode de remboursement documentaires.",
  kitchen: "Journal des décisions : préparations, compléments, substitutions et refus sont reliés au service. Les notes ne doivent pas déclencher une seconde production.",
  ledger: "Contrôle : initial + reçu - production brute - pertes brutes + écart = final. Les autres déchets sont des fractions de matière déjà sorties en production.",
};
export type WriteDocument = (kind: keyof typeof workflows, title: string, date: string, suffix: string, sections: Section[], notes?: string[],
  parties?: { issuer?: string; recipient?: string; style?: DocumentStyle }) => void;
export const section = (heading: string, columns: string[], rows: string[][]): Section => ({ heading, columns, rows });
export const serviceLabel = (service: "lunch" | "dinner") => service === "lunch" ? "Midi" : "Soir";
