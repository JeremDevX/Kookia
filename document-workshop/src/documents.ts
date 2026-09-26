import { recipeById } from "./catalog";
import { workflows } from "./documentModel";
import type { Document, WriteDocument } from "./documentModel";
import type { Scenario } from "./model";
import { purchaseDocuments } from "./purchaseDocuments";
import { dailySales, serviceDocuments } from "./serviceDocuments";
import { setupDocuments } from "./setupDocuments";
import { stockDocuments } from "./stockDocuments";

export { workflows } from "./documentModel";
export type { Document, Section } from "./documentModel";
export { dailySales } from "./serviceDocuments";
export function createDocuments(scenario: Scenario): Document[] {
  const docs: Document[] = [], { options } = scenario;
  const add: WriteDocument = (kind, title, date, suffix, sections, notes = [], parties = {}) => {
    docs.push({ id: `${kind}-${date}-${options.seed}-${suffix}`, kind, title, date, sections, notes,
      issuer: parties.issuer ?? options.name, recipient: parties.recipient ?? `${options.name} · ${options.address} · ${options.city}`,
      style: parties.style ?? "house", workflow: workflows[kind] });
  };
  setupDocuments(scenario, add);
  purchaseDocuments(scenario, add);
  for (const day of scenario.days) {
    serviceDocuments(scenario, day, add);
    stockDocuments(day, add);
  }
  return docs;
}
export function salesCsv(scenario: Scenario) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return "service_date,item_name,quantity\r\n" + scenario.days.flatMap(day => dailySales(day).map(({ recipeId, sold }) =>
    `${day.date},${quote(recipeById(recipeId).name)},${sold}`)).join("\r\n") + "\r\n";
}
