import { dailySales, salesCsv } from "./documents";
import type { Document } from "./documents";
import { workflows } from "./documents";
import { pdfBytes } from "./exports";
import type { ArchiveFile } from "./exports";
import type { Scenario } from "./scenario";
import { scenarioWeatherNotice, terraceLabel } from "./weather";
export const labels: Record<keyof typeof workflows, string> = {
  identity: "Établissement", suppliers: "Fournisseurs", catalog: "Produits", recipes: "Fiches techniques", menu: "Menus", forecast: "Prévisions",
  order: "Commandes", invoice: "Factures fournisseurs", delivery: "Livraisons", credit: "Avoirs", production: "Productions",
  adjustment: "Régularisations", refund: "Avoirs clients", kitchen: "Décisions cuisine",
  sales: "Bilans de service", ticket: "Tickets Z", customer: "Factures clients", waste: "Pertes et déchets", count: "Inventaires", service: "Services", ledger: "Journal matière", lots: "Lots et échéances",
};
export function guide(scenario: Scenario, docs: Document[]) {
  return `# ${scenario.options.name} — Dossier d'exploitation\n\nPériode : ${scenario.days[0].date} au ${scenario.days.at(-1)!.date}.\n\n` +
    "## Utiliser le dossier au fil des jours\n\ninstallation contient les références et le calendrier. Les pièces sont classées par leur date réelle : une commande peut précéder la période, une facture suivre la livraison. Chaque journée avec ventes a son ventes.csv ; les jours fermés ou sans vente ont une note, jamais un CSV invalide à importer. Le CSV global inclut les ventes futures : utiliser les CSV quotidiens à partir de leur date.\n\n" +
    "## Ordre de saisie\n\nÉtablissement → fournisseurs → produits et stock d'ouverture rapproché → recettes en dosages BRUTS → commandes → réceptions → pertes brutes avant cuisine → productions réellement préparées → ventes → régularisation/comptage → couverture. Ne pas redéduire les parures, invendus ou retours d'assiette. Les ventes et productions futures sont refusées par Kookia.\n\n" +
    `## Reprise\n\n${scenario.opening ? `Ce dossier reprend la clôture du ${scenario.opening.asOf}. Les stocks d'ouverture et commandes déjà émises ne sont pas de nouvelles entrées.` : "Nouveau dossier à stock initial nul : cette hypothèse ne remet jamais à zéro un stock préexistant dans Kookia."} Pour continuer après le ${scenario.checkpoint.asOf}, charger stock-reprise.json dans l'atelier. Les lots gardent leur âge et les commandes en attente restent en attente. La reprise commence obligatoirement le lendemain ; elle ne rejoue pas les opérations précédentes.\n\n` +
    `## Terrasse et météo\n\nTerrasse : ${terraceLabel(scenario.options.hasTerrace)}. ${scenarioWeatherNotice} Les prévisions montrent la base semaine/saison et le coefficient de la journée, renforcé avec terrasse. Les achats et préparations partent des estimations ajustées, pas des demandes futures. Sans météo ou sans indication de terrasse, aucun ajustement. Les couverts sont arrondis par service, puis les portions par recette et les lots de préparation. Les demandes du dossier varient autour de ces estimations : ce scénario ne mesure donc pas un gain prédictif.\n\nRevoir Terrasse dans Paramètres → Restaurant. La commune se confirme séparément depuis le bouton météo Kookia ; aucune condition du dossier ne doit être présentée comme donnée Open-Meteo ni importée comme contexte réel. Ne pas réappliquer le coefficient aux quantités déjà ajustées. Lors d’une reprise, vérifier les réglages Terrasse et Météo du formulaire ; le fichier de stock ne les remplace pas.\n\n` +
    Object.entries(workflows).map(([key, value]) => `## ${labels[key as keyof typeof labels]}\n\n${value}\n`).join("\n") +
    "\n## Limites des entrées\n\nLes PDF sont des pièces de travail. Seul ventes.csv est directement importable en tableau. Les autres données sont reprises dans les formulaires concernés. Aucun accès à Kookia, aucune connexion caisse, aucun envoi fournisseur ni écriture de base depuis cet atelier. Les réglages de compte, de source, de notification et d'affichage ne sont pas des documents métier. Les rapports d'impact et l'historique sont calculés par Kookia à partir des opérations, pas importés.\n\n" +
    "## Contrôle\n\nscenario.json version 2 contient le catalogue figé, les prévisions, services, transactions, déchets, lots de clôture et commandes. Montants en centimes, matière au millième. Les sommes de transactions expliquent remises, TVA, remboursements et modes de règlement du Z. Les prix d'achat sont HT, ceux de vente TTC. Les quantités de vente viennent des articles servis, pas des quantités prévues ou préparées.\n\n" +
    "## Hypothèses\n\nCalendrier, fréquentation, rendements, prix et durées de lots sont des paramètres de travail non calibrés sur le terrain. Les durées ne sont pas des consignes sanitaires. Les invendus sont écartés en fin de service dans ce dossier ; les retours d'assiette sont estimés en équivalents-portions, sans poids cuit mesuré. Ne pas agréger kg, L et portions. Les lots et déchets cuisinés se rapprochent via les formulaires revus de Kookia, sans import automatique du JSON ni seconde sortie de matière.\n\n" +
    "## Pièces\n\n" + docs.map(doc => `- ${documentPath(doc)} : ${doc.title}`).join("\n");
}

const setupKinds = new Set(["identity", "suppliers", "catalog", "recipes", "service"]);
export function documentPath(doc: Document) {
  return `${setupKinds.has(doc.kind) ? "installation" : doc.date}/${doc.id}.pdf`;
}
export function readySales(scenario: Scenario, today: string): Scenario {
  return { ...scenario, days: scenario.days.filter(day => day.date <= today && dailySales(day).length > 0) };
}
export function archiveFiles(scenario: Scenario, docs: Document[]): ArchiveFile[] {
  const encoder = new TextEncoder();
  const files: ArchiveFile[] = docs.map(doc => ({ name: documentPath(doc), bytes: pdfBytes(doc) }));
  for (const day of scenario.days) {
    if (dailySales(day).length) files.push({ name: `${day.date}/ventes.csv`, bytes: encoder.encode(salesCsv({ ...scenario, days: [day] })) });
    else files.push({ name: `${day.date}/sans-ventes.md`, bytes: encoder.encode(day.open ? "Journée ouverte sans vente. Aucun CSV à importer ; revoir la couverture du service dans Kookia.\n" : "Journée fermée. Aucun CSV à importer ; renseigner la fermeture dans le calendrier Kookia.\n") });
  }
  if (scenario.days.some(day => dailySales(day).length)) files.push({ name: "ventes-periode-complete.csv", bytes: encoder.encode(salesCsv(scenario)) });
  files.push({ name: "guide.md", bytes: encoder.encode(guide(scenario, docs)) },
    { name: "scenario.json", bytes: encoder.encode(JSON.stringify(scenario, null, 2)) },
    { name: "stock-reprise.json", bytes: encoder.encode(JSON.stringify(scenario.checkpoint, null, 2)) });
  return files;
}
