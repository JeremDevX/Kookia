import { describe, expect, it } from "vitest";
import { recipeById } from "./catalog";
import { createDocuments, salesCsv } from "./documents";
import { archiveFiles, readySales } from "./dossier";
import { pdfBytes, zipBytes } from "./exports";
import { layoutDocument } from "./layout";
import { generateScenario } from "./scenario";
import { workshopOptions as input } from "./testFixtures";
import { parseSalesCsv } from "../../server/src/application/workspace/salesCsv";
import { inspectTicketZUpload } from "../../server/src/application/workspace/ticketZService";

describe("workshop document contracts", () => {
  it("exports unique day/article CSV quantities from served transaction lines, not forecasts", () => {
    const scenario = generateScenario({ ...input, services: "both", incident: "mixed" });
    const rows = parseSalesCsv(salesCsv(scenario), "2026-12-31").rows;
    expect(rows.every(row => !row.error)).toBe(true);
    expect(new Set(rows.map(row => `${row.serviceDate}:${row.itemName}`)).size).toBe(rows.length);
    for (const row of rows) {
      const day = scenario.days.find(d => d.date === row.serviceDate)!;
      const expected = day.services.flatMap(s => s.transactions.flatMap(t => t.lines))
        .filter(l => recipeById(l.recipeId).name === row.itemName).reduce((sum, l) => sum + l.quantity, 0);
      expect(row.quantity).toBe(expected);
    }
    expect(rows.some(row => row.itemName.includes(","))).toBe(true);
    expect(rows.every(row => row.quantity > 0)).toBe(true);
    const ready = readySales(scenario, "2026-09-10");
    expect(parseSalesCsv(salesCsv(ready), "2026-09-10").rows.every(row => !row.error)).toBe(true);
    expect(readySales(scenario, "2026-08-31").days).toHaveLength(0);
  });
  it("dates and links supplier documents without inventing a receipt for pending orders", () => {
    const scenario = generateScenario({ ...input, incident: "short_delivery", days: 7 });
    const docs = createDocuments(scenario);
    expect(new Set(docs.map(d => d.id)).size).toBe(docs.length);
    expect(new Set(docs.filter(d => d.kind === "invoice").map(d => d.style))).toEqual(new Set(["market", "farm", "wholesale"]));
    for (const p of scenario.purchases) {
      const related = docs.filter(d => d.id.endsWith(p.id.slice(3)));
      expect(related.find(d => d.kind === "order")?.date).toBe(p.placedOn);
      if (p.receivedOn) {
        expect(related.find(d => d.kind === "delivery")?.date).toBe(p.receivedOn);
        expect(related.find(d => d.kind === "invoice")?.date).toBe(p.invoiceOn);
        expect(p.placedOn < p.receivedOn && p.receivedOn < p.invoiceOn!).toBe(true);
        expect(related.some(d => d.kind === "credit")).toBe(p.lines.some(l => l.shortage));
      } else expect(related.map(d => d.kind)).toEqual(["order"]);
    }
    expect(JSON.stringify(docs)).not.toMatch(/ficti|démonstration/i);
  });
  it("documents actual productions, stock-only losses and source-linked refunds", () => {
    const scenario = generateScenario({ ...input, incident: "refund", days: 7 });
    const docs = createDocuments(scenario);
    for (const day of scenario.days.filter(d => d.open)) {
      const production = docs.find(d => d.kind === "production" && d.date === day.date)!;
      const total = production.sections.flatMap(s => s.rows).reduce((n, row) => n + Number(row[3]), 0);
      expect(total).toBe(day.services.flatMap(s => s.runs).reduce((n, r) => n + r.prepared, 0));
      const refunds = day.services.flatMap(s => s.transactions).filter(t => t.refund);
      expect(docs.filter(d => d.kind === "refund" && d.date === day.date)).toHaveLength(refunds.length);
      const losses = docs.find(d => d.kind === "waste" && d.date === day.date)!;
      expect(losses.sections[0].rows).toHaveLength(day.waste.filter(w => w.stockEffect).length);
      expect(losses.workflow).toContain("aucune seconde déduction");
    }
  });
  it("renders bounded pages for every template, including long identities and a 90-day calendar", () => {
    const docs = createDocuments(generateScenario({ ...input, days: 90, name: "Restaurant " + "W".repeat(69), incident: "mixed" }));
    const calendar = docs.find(d => d.kind === "service")!;
    expect(layoutDocument(calendar).length).toBeGreaterThan(1);
    for (const doc of docs) for (const page of layoutDocument(doc)) for (const run of page.runs) {
      expect(run.y).toBeLessThanOrEqual(page.height - 20);
      expect(run.x).toBeGreaterThanOrEqual(16);
      expect(run.text.length * run.size * .62 + run.x).toBeLessThanOrEqual(page.width - 8);
    }
    for (const style of ["house", "market", "farm", "wholesale", "receipt"]) {
      const doc = docs.find(d => d.style === style)!;
      const bytes = pdfBytes(doc), source = new TextDecoder().decode(bytes);
      expect(source).toContain(style === "receipt" ? "/MediaBox [0 0 280 842]" : "/MediaBox [0 0 595 842]");
      expect(inspectTicketZUpload("application/pdf", Buffer.from(bytes)).mimeType).toBe("application/pdf");
    }
  });
  it("packages daily CSVs only for actual sales, closed-day notes, catalog and continuation", () => {
    const scenario = generateScenario({ ...input, days: 7 });
    const files = archiveFiles(scenario, createDocuments(scenario));
    expect(new Set(files.map(file => file.name)).size).toBe(files.length);
    const checkpoint = JSON.parse(new TextDecoder().decode(files.find(f => f.name === "stock-reprise.json")!.bytes));
    expect(checkpoint).toEqual(scenario.checkpoint);
    const journal = JSON.parse(new TextDecoder().decode(files.find(f => f.name === "scenario.json")!.bytes));
    expect(journal.catalog.version).toBe(2); expect(journal.catalog.recipes.length).toBeGreaterThan(3);
    for (const day of scenario.days) {
      const csv = files.find(file => file.name === `${day.date}/ventes.csv`);
      if (!day.open) { expect(csv).toBeUndefined(); expect(files.some(f => f.name === `${day.date}/sans-ventes.md`)).toBe(true); }
      else {
        const parsed = parseSalesCsv(new TextDecoder().decode(csv!.bytes), "2026-12-31");
        expect(parsed.rows.every(row => row.serviceDate === day.date && !row.error)).toBe(true);
      }
    }
    const closed = generateScenario({ ...input, start: "2026-09-07", days: 1 });
    expect(archiveFiles(closed, createDocuments(closed)).some(f => f.name.endsWith(".csv"))).toBe(false);
  });
  it("writes coherent ZIP offsets, UTF-8 names and payload lengths", () => {
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
