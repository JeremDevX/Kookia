import { ingredientById, recipeById, type Recipe } from "./catalog";
import { workflows } from "./documentModel";
import type { ArticleSales, DaySales, Document, WriteDocument } from "./documentModel";
import { grossDosages } from "./inventory";
import type { Day, Scenario } from "./model";
import { purchaseDocuments } from "./purchaseDocuments";
import { serviceDocuments } from "./serviceDocuments";
import { setupDocuments } from "./setupDocuments";
import { stockDocuments } from "./stockDocuments";

const quoteCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;

function dailySales(day: Day): DaySales {
  const articles = new Map<string, ArticleSales>();
  for (const service of day.services) for (const transaction of service.transactions) for (const line of transaction.lines) {
    const article = articles.get(line.recipeId) ?? { sold: 0, gross: 0 };
    article.sold += line.quantity;
    article.gross += line.quantity * line.unitPrice;
    articles.set(line.recipeId, article);
  }
  return { date: day.date, open: day.open, articles };
}
export function createDocuments(scenario: Scenario) {
  const docs: Document[] = [], { options } = scenario;
  const add: WriteDocument = (kind, title, date, suffix, sections, notes = [], parties = {}) => {
    docs.push({ id: `${kind}-${date}-${options.seed}-${suffix}`, kind, title, date, sections, notes,
      issuer: parties.issuer ?? options.name, recipient: parties.recipient ?? `${options.name} · ${options.address} · ${options.city}`,
      style: parties.style ?? "house", workflow: workflows[kind] });
  };
  setupDocuments(scenario, add);
  purchaseDocuments(scenario, add);
  const sales = scenario.days.map(day => {
    const summary = dailySales(day);
    serviceDocuments(scenario, day, summary.articles, add);
    stockDocuments(day, add);
    return summary;
  });
  return { docs, sales };
}
export function salesCsv(days: readonly DaySales[]) {
  return "service_date,item_name,quantity\r\n" + days.flatMap(day => [...day.articles].map(([recipeId, { sold }]) =>
    `${day.date},${quoteCsv(recipeById(recipeId).name)},${sold}`)).join("\r\n") + "\r\n";
}

export function recipeCsv(recipe: Recipe, lossPercent: number) {
  const rows = Object.entries(grossDosages(recipe, lossPercent)).map(([id, dose]) => {
    const { name, unit } = ingredientById(id);
    return `${quoteCsv(name)};${dose};${unit}`;
  });
  return ["Produit;Quantité brute;Unité", ...rows, ""].join("\r\n");
}

export function readySales(days: readonly DaySales[], today: string) {
  return days.filter(day => day.date <= today && day.articles.size > 0);
}

export const readySalesFilename = (today: string) => `ventes-jusqu-au-${today}.csv`;
