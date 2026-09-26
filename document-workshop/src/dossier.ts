import { salesCsv } from "./documents";
import type { Document } from "./documents";
import { workflows } from "./documents";
import { pdfBytes } from "./exports";
import type { ArchiveFile } from "./exports";
import type { Scenario } from "./scenario";
export const labels: Record<keyof typeof workflows, string> = {
  identity: "Établissement", suppliers: "Fournisseurs", catalog: "Produits", recipes: "Fiches techniques", menu: "Menus",
  order: "Commandes", invoice: "Factures fournisseurs", delivery: "Livraisons", credit: "Avoirs", production: "Productions",
  adjustment: "Régularisations", refund: "Avoirs clients", kitchen: "Décisions cuisine",
  sales: "Ventes CSV", ticket: "Tickets Z", customer: "Factures clients", waste: "Pertes", count: "Inventaires", service: "Services", ledger: "Journal matière",
};
export function guide(scenario: Scenario, docs: Document[]) {
  return `# ${scenario.options.name} — Dossier d'exploitation\n\nPériode : ${scenario.days[0].date} au ${scenario.days.at(-1)!.date}.\n\n` +
    "## Utiliser le dossier au fil des jours\n\nLe répertoire installation contient les fiches de référence et le calendrier. Chaque répertoire date contient ses PDF et son ventes.csv. Le CSV global couvre toute la période, y compris les dates futures : pour Kookia, utilisez les fichiers quotidiens à partir de leur date. Les ventes et productions futures sont refusées par Kookia. Aucun redémarrage du générateur n’est nécessaire.\n\n" +
    "## Ordre de saisie\n\nÉtablissement → fournisseurs → produits (stock initial 0) → recettes et articles → achats → réceptions → productions → ventes → pertes → inventaire → couverture des services.\n\n" +
    Object.entries(workflows).map(([key, value]) => `## ${labels[key as keyof typeof labels]}\n\n${value}\n`).join("\n") +
    "\n## Limites des entrées\n\nLes PDF sont des pièces de travail. Seul ventes.csv est directement importable en tableau. Les autres données sont reprises dans les formulaires concernés. Aucun accès à Kookia, aucune connexion caisse, aucun envoi fournisseur ni écriture de base depuis cet atelier. Les réglages de compte, de source, de notification et d'affichage ne sont pas des documents métier. Les rapports d'impact et l'historique sont calculés par Kookia à partir des opérations, pas importés.\n\n" +
    "## Contrôle\n\nscenario.json contient le journal chiffré de toutes les journées. Les feuilles d'inventaire donnent le stock attendu à chaque fermeture. Pour des données déjà présentes, rapprocher les stocks et les sources, ne pas les écraser. Le rapprochement fournisseur inclut les quantités manquantes et leurs avoirs. Les montants d'achat sont HT, les prix de la carte sont TTC.\n\n" +
    "## Pièces\n\n" + docs.map(doc => `- ${documentPath(doc)} : ${doc.title}`).join("\n");
}

const setupKinds = new Set(["identity", "suppliers", "catalog", "recipes", "service"]);
export function documentPath(doc: Document) {
  return `${setupKinds.has(doc.kind) ? "installation" : doc.date}/${doc.id}.pdf`;
}
export function readySales(scenario: Scenario, today: string): Scenario {
  return { ...scenario, days: scenario.days.filter(day => day.date <= today) };
}
export function archiveFiles(scenario: Scenario, docs: Document[]): ArchiveFile[] {
  const encoder = new TextEncoder();
  const files: ArchiveFile[] = docs.map(doc => ({ name: documentPath(doc), bytes: pdfBytes(doc) }));
  for (const day of scenario.days) files.push({ name: `${day.date}/ventes.csv`, bytes: encoder.encode(salesCsv({ ...scenario, days: [day] })) });
  files.push({ name: "ventes-periode-complete.csv", bytes: encoder.encode(salesCsv(scenario)) },
    { name: "guide.md", bytes: encoder.encode(guide(scenario, docs)) },
    { name: "scenario.json", bytes: encoder.encode(JSON.stringify(scenario, null, 2)) });
  return files;
}
