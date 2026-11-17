import { includedRecipes } from "./catalog";
import { createDocuments, recipeCsv, salesCsv } from "./documents";
import { workflowEntries } from "./documentModel";
import type { Document } from "./documentModel";
import { pdfBytes } from "./exports";
import type { Scenario } from "./model";
import { scenarioWeatherNotice, terraceLabel } from "./weather";
import type { ArchiveFile } from "./zip";

function guide(scenario: Scenario, docs: Document[]) {
  return `# ${scenario.options.name} — Dossier d'exploitation\n\nPériode : ${scenario.days[0].date} au ${scenario.days.at(-1)!.date}.\n\n` +
    "## Utiliser le dossier au fil des jours\n\nLes opérations de ce dossier sont simulées. Pour essayer la saisie ou les imports, utilisez un espace de test isolé. Un CSV de ventes importé par le parcours standard alimente les ventes enregistrées de l'espace.\n\ninstallation contient les références, le calendrier et les CSV des ingrédients dans installation/recettes/. Les pièces suivent leur date d'émission. Une commande peut précéder la période, une facture suivre la livraison. Chaque journée avec ventes a son ventes.csv. Les jours fermés ou sans vente ont une note. Le CSV global inclut les ventes futures. Utilisez les CSV quotidiens à partir de leur date.\n\n" +
    "## Ordre de saisie dans un espace de test\n\nPréparez l'établissement, les fournisseurs, le catalogue et les fiches recettes. Rapprochez les commandes, puis les réceptions et les pertes brutes avant cuisine. Pour chaque service, vérifiez la carte, revoyez le plan et saisissez le total préparé par recette. Ensuite, ajoutez les ventes une seule fois, ventilez-les et rapprochez les invendus avant de clôturer. Le calendrier, les comptages et le journal matière aident à vérifier les écarts. Respectez la date de chaque opération.\n\n" +
    `## Reprise\n\n${scenario.opening ? `Ce dossier reprend la clôture du ${scenario.opening.asOf}. Les stocks d'ouverture et commandes déjà émises ne sont pas de nouvelles entrées.` : "Nouveau dossier à stock initial nul : cette hypothèse ne remet jamais à zéro un stock préexistant dans Kookia."} Pour continuer après le ${scenario.checkpoint.asOf}, charger stock-reprise.json dans l'atelier. Les lots gardent leur âge et les commandes en attente restent en attente. La reprise commence obligatoirement le lendemain ; elle ne rejoue pas les opérations précédentes.\n\n` +
    `## Terrasse et météo\n\nTerrasse : ${terraceLabel(scenario.options.hasTerrace)}. ${scenarioWeatherNotice} Les prévisions montrent la base semaine/saison et le coefficient de la journée, renforcé avec terrasse. Les achats et préparations partent des estimations ajustées, pas des demandes futures. Sans météo ou sans indication de terrasse, aucun ajustement. Les couverts sont arrondis par service, puis les portions par recette et les lots de préparation. Les demandes du dossier varient autour de ces estimations : ce scénario ne mesure donc pas un gain prédictif.\n\nRevoir Terrasse dans Paramètres → Restaurant. La commune se confirme séparément depuis le bouton météo Kookia ; aucune condition du dossier ne doit être présentée comme donnée Open-Meteo ni importée comme contexte réel. Ne pas réappliquer le coefficient aux quantités déjà ajustées. Lors d’une reprise, vérifier les réglages Terrasse et Météo du formulaire ; le fichier de stock ne les remplace pas.\n\n` +
    workflowEntries.map(({ label, text }) => `## ${label}\n\n${text}\n`).join("\n") +
    "\n## Imports et saisies\n\nKookia peut lire les CSV des ventes et des ingrédients des recettes. Vérifiez les correspondances puis confirmez dans Kookia. Les PDF servent de référence pour les formulaires. L'Historique et le Bilan sont calculés à partir des opérations enregistrées dans l'espace.\n\n" +
    "## Contrôle\n\nscenario.json version 2 contient le catalogue figé, les prévisions, services, transactions, déchets, lots de clôture et commandes. Montants en centimes, matière au millième. Les sommes de transactions expliquent remises, TVA, remboursements et modes de règlement du Z. Les prix d'achat sont HT, ceux de vente TTC. Les quantités de vente viennent des articles servis, pas des quantités prévues ou préparées.\n\n" +
    "## Hypothèses\n\nCalendrier, fréquentation, rendements, prix et durées de lots sont des paramètres de travail non calibrés sur le terrain. Les durées ne sont pas des consignes sanitaires. Les invendus sont écartés en fin de service dans ce dossier ; les retours d'assiette sont estimés en équivalents-portions, sans poids cuit mesuré. Ne pas agréger kg, L et portions. Les lots et déchets cuisinés se rapprochent via les formulaires revus de Kookia, sans import automatique du JSON ni seconde sortie de matière.\n\n" +
    "## Pièces\n\n" + docs.map(doc => `- ${documentPath(doc)} : ${doc.title}`).join("\n");
}

const setupKinds = new Set<Document["kind"]>(["identity", "suppliers", "catalog", "recipes", "service"]);
function documentPath(doc: Document) {
  return `${setupKinds.has(doc.kind) ? "installation" : doc.date}/${doc.id}.pdf`;
}
export function archiveFiles(scenario: Scenario): ArchiveFile[] {
  const { docs, sales } = createDocuments(scenario);
  const encoder = new TextEncoder();
  const files: ArchiveFile[] = docs.map(doc => ({ name: documentPath(doc), bytes: pdfBytes(doc) }));
  for (const recipe of includedRecipes(scenario.options.drinks)) {
    files.push({ name: `installation/recettes/${recipe.id}.csv`, bytes: encoder.encode(recipeCsv(recipe, scenario.options.lossPercent)) });
  }
  for (const day of sales) {
    if (day.articles.size) files.push({ name: `${day.date}/ventes.csv`, bytes: encoder.encode(salesCsv([day])) });
    else files.push({ name: `${day.date}/sans-ventes.md`, bytes: encoder.encode(day.open ? "Journée ouverte sans vente. Aucun CSV à importer ; revoir la couverture du service dans Kookia.\n" : "Journée fermée. Aucun CSV à importer ; renseigner la fermeture dans le calendrier Kookia.\n") });
  }
  if (sales.some(day => day.articles.size)) files.push({ name: "ventes-periode-complete.csv", bytes: encoder.encode(salesCsv(sales)) });
  files.push({ name: "guide.md", bytes: encoder.encode(guide(scenario, docs)) },
    { name: "scenario.json", bytes: encoder.encode(JSON.stringify(scenario, null, 2)) },
    { name: "stock-reprise.json", bytes: encoder.encode(JSON.stringify(scenario.checkpoint, null, 2)) });
  return files;
}
