import { describe, expect, it } from "vitest";
import { ingredients, recipes } from "./catalog";
import { createDocuments, salesCsv } from "./documents";
import { pdfBytes, zipBytes } from "./exports";
import { layoutDocument } from "./layout";
import { archiveFiles, readySales } from "./dossier";
import { displayDate, generateScenario } from "./scenario";
import type { Options } from "./scenario";
import { parseSalesCsv } from "../../server/src/application/workspace/salesCsv";
import { inspectTicketZUpload } from "../../server/src/application/workspace/ticketZService";
import { getOrderStep, isOrderQuantity } from "../../shared/orderQuantity";

const input: Options = { name: "Maison Sureau", address: "18, passage des Tilleuls", city: "44000 Nantes",
  email: "bonjour@maison-sureau.example", start: "2026-06-01", days: 30, covers: 40, seed: 12, incident: "normal", variationPercent: 20, lossPercent: 2, starterPercent: 65, dessertPercent: 60, incidentEvery: 1 };
describe("restaurant document workshop", () => {
  it.each(["normal", "short_delivery", "high_waste", "refund", "stock_gap"] as const)("reconciles all stock and cash for %s over 90 days", incident => {
    const scenario = generateScenario({ ...input, days: 90, covers: 200, incident });
    for (const [index, day] of scenario.days.entries()) {
      expect(day.card + day.cash).toBe(day.collected);
      expect(day.net + day.tax).toBe(day.collected);
      expect(day.gross).toBe(day.sales.reduce((sum, q, r) => sum + q * recipes[r].price, 0));
      for (const [p, line] of day.stock.entries()) {
        expect(line.opening).toBe(index ? scenario.days[index - 1].stock[p].closing : 0);
        expect(line.opening + line.received - line.consumed - line.loss + line.adjustment).toBeCloseTo(line.closing, 3);
        expect(line.ordered - line.shortage).toBeCloseTo(line.received, 3);
        expect(line.closing).toBeGreaterThanOrEqual(0);
        const step = getOrderStep(ingredients[p]);
        expect(line.ordered === 0 || isOrderQuantity(line.ordered, step)).toBe(true);
        expect(line.closing).toBeGreaterThanOrEqual(ingredients[p].threshold - line.shortage + line.adjustment - 1e-9);
        expect(line.closing).toBeLessThan(ingredients[p].threshold + step + line.adjustment);
      }
    }
  });
  it("reuses rounding surplus and omits purchases already covered by stock", () => {
    const scenario = generateScenario({ ...input, covers: 5, variationPercent: 0, lossPercent: 0 });
    const oil = scenario.days.map(day => day.stock.find(line => line.id === "huile")!);
    expect(oil[0].ordered).toBe(1);
    expect(oil[0].consumed).toBe(0.064);
    expect(oil[1].ordered).toBe(0);
    expect(oil[1].received).toBe(0);
    expect(oil[1].closing).toBe(0.872);
    expect(oil.reduce((total, line) => total + line.ordered, 0)).toBe(2.5);
    const docs = createDocuments(scenario);
    for (const day of scenario.days) for (const line of day.stock) {
      const product = ingredients.find(product => product.id === line.id)!;
      const order = docs.find(doc => doc.kind === "order" && doc.date === day.date && doc.id.endsWith(product.supplier));
      const row = order?.sections[0].rows.find(row => row[0] === product.name);
      expect(!!row).toBe(line.ordered > 0);
    }
  });
  it("is reproducible, varies by dossier, and rejects invalid periods", () => {
    expect(generateScenario(input)).toEqual(generateScenario(input));
    expect(generateScenario({ ...input, seed: 13 })).not.toEqual(generateScenario(input));
    expect(() => generateScenario({ ...input, days: 91 })).toThrow();
    expect(() => generateScenario({ ...input, start: "9999-12-31", days: 2 })).toThrow();
    expect(displayDate("+010000-01")).toBe("Date invalide");
    expect(() => generateScenario({ ...input, covers: 0 })).toThrow();
    expect(() => generateScenario({ ...input, start: "2026-02-30" })).toThrow();
    expect(generateScenario({ ...input, start: "2030-12-20" }).days.at(-1)?.date).toBe("2031-01-18");
  });
  it("exports CSV accepted by the actual Kookia parser, including quoted commas", () => {
    const scenario = generateScenario(input);
    const parsed = parseSalesCsv(salesCsv(scenario), "2026-09-26");
    expect(parsed.rows).toHaveLength(90);
    expect(parsed.rows.every(row => !row.error)).toBe(true);
    expect(parsed.rows[1].itemName).toBe("Poulet, riz et courgettes");
    expect(parsed.rows[1].quantity).toBe(scenario.days[0].sales[1]);
  });
  it("covers every document family and credits only undelivered quantities", () => {
    const docs = createDocuments(generateScenario({ ...input, incident: "short_delivery" }));
    expect(new Set(docs.map(d => d.kind))).toEqual(new Set(["identity", "suppliers", "catalog", "recipes", "menu", "order", "invoice", "delivery", "credit", "production", "ticket", "customer", "waste", "count", "service", "ledger", "kitchen"]));
    expect(new Set(docs.map(d => d.id)).size).toBe(docs.length);
    expect(docs.filter(d => d.kind === "credit")).toHaveLength(30);
    expect(docs.find(d => d.kind === "credit")?.sections[0].rows[0]).toEqual(["Tomates", "0,5 kg", "-1,90 EUR"]);
    expect(JSON.stringify(docs)).not.toMatch(/simul|démonstration|ficti/i);
  });
  it("creates bounded, paginated PDFs and satisfies the Ticket Z upload boundary", () => {
    const docs = createDocuments(generateScenario({ ...input, days: 90, name: "Restaurant " + "W".repeat(69) }));
    const calendar = docs.find(d => d.kind === "service")!;
    expect(layoutDocument(calendar).length).toBeGreaterThan(1);
    for (const doc of docs.slice(0, 30)) {
      const pdf = pdfBytes(doc);
      expect(new TextDecoder().decode(pdf).startsWith("%PDF-1.4")).toBe(true);
      expect(inspectTicketZUpload("application/pdf", Buffer.from(pdf)).mimeType).toBe("application/pdf");
      for (const page of layoutDocument(doc)) for (const run of page.runs) {
        expect(run.y).toBeLessThanOrEqual(805);
        expect(run.x).toBeGreaterThanOrEqual(40);
        expect(run.text.length * run.size * 0.62 + run.x).toBeLessThanOrEqual(590);
      }
    }
  });
  it("exposes controlled rates and keeps daily covers inside the requested bounds", () => {
    const constant = generateScenario({ ...input, variationPercent: 0, starterPercent: 50, dessertPercent: 100, lossPercent: 0 });
    for (const day of constant.days) {
      expect(day.covers).toBe(40);
      expect(day.sales).toEqual([20, 40, 40]);
      expect(day.stock.every(line => line.loss === 0)).toBe(true);
    }
    const varied = generateScenario({ ...input, variationPercent: 50 });
    expect(new Set(varied.days.map(day => day.covers)).size).toBeGreaterThan(1);
    expect(varied.days.every(day => day.covers >= 20 && day.covers <= 60)).toBe(true);
    expect(() => generateScenario({ ...input, variationPercent: 51 })).toThrow();
    expect(() => generateScenario({ ...input, lossPercent: -1 })).toThrow();
    expect(() => generateScenario({ ...input, incidentEvery: 0 })).toThrow();
  });
  it("applies incidents only at the requested frequency and reflects them in the documents", () => {
    const scenario = generateScenario({ ...input, days: 7, incident: "short_delivery", incidentEvery: 3 });
    expect(scenario.days.filter(day => day.incident !== "normal").map(day => day.date)).toEqual(["2026-06-03", "2026-06-06"]);
    expect(createDocuments(scenario).filter(doc => doc.kind === "credit").map(doc => doc.date)).toEqual(["2026-06-03", "2026-06-06"]);
    const losses = generateScenario({ ...input, days: 4, incident: "high_waste", incidentEvery: 2, variationPercent: 0 });
    expect(losses.days[1].stock[0].loss).toBeGreaterThan(losses.days[0].stock[0].loss);
    expect(losses.days[2].stock[0].loss).toBe(losses.days[0].stock[0].loss);
  });
  it("prepares a past/future period and isolates CSV rows currently accepted by Kookia", () => {
    const scenario = generateScenario({ ...input, start: "2030-12-29", days: 7 });
    expect(scenario.days.at(-1)?.date).toBe("2031-01-04");
    const ready = readySales(scenario, "2031-01-01");
    expect(ready.days).toHaveLength(4);
    expect(parseSalesCsv(salesCsv(ready), "2031-01-01").rows.every(row => !row.error)).toBe(true);
    expect(parseSalesCsv(salesCsv(scenario), "2031-01-01").rows.filter(row => row.error)).toHaveLength(9);
    expect(readySales(scenario, "2026-09-26").days).toHaveLength(0);
    expect(generateScenario({ ...input, start: "2010-01-01", days: 7 }).days).toHaveLength(7);
  });
  it("packages the whole period by day with reusable setup documents and exact daily CSVs", () => {
    const scenario = generateScenario({ ...input, start: "2030-12-29", days: 7 });
    const files = archiveFiles(scenario, createDocuments(scenario));
    expect(new Set(files.map(file => file.name)).size).toBe(files.length);
    expect(files.some(file => file.name.startsWith("installation/recipes-"))).toBe(true);
    for (const day of scenario.days) {
      const csv = files.find(file => file.name === `${day.date}/ventes.csv`)!;
      const parsed = parseSalesCsv(new TextDecoder().decode(csv.bytes), "2031-01-04");
      expect(parsed.rows).toHaveLength(3);
      expect(parsed.rows.every(row => row.serviceDate === day.date && !row.error)).toBe(true);
      expect(parsed.rows.map(row => row.quantity)).toEqual(day.sales);
      expect(files.some(file => file.name.startsWith(`${day.date}/ticket-`))).toBe(true);
    }
  });
  it("writes ZIP offsets, lengths and signatures consistently", () => {
    const files = [{ name: "épreuve.txt", bytes: new TextEncoder().encode("Contenu accentué") }];
    const bytes = zipBytes(files), view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const nameSize = view.getUint16(26, true);
    expect(new TextDecoder().decode(bytes.slice(30, 30 + nameSize))).toBe(files[0].name);
    expect(new TextDecoder().decode(bytes.slice(30 + nameSize, 30 + nameSize + files[0].bytes.length))).toBe("Contenu accentué");
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 8, true)).toBe(1);
    expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50);
  });
});
