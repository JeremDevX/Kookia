import { describe, expect, it } from "vitest";
import { offsetDate } from "./calendar";
import { ingredientById, money, number, recipeById } from "./catalog";
import { parseCheckpointFile } from "./continuation";
import { createDocuments, readySales, salesCsv } from "./documents";
import { archiveFiles } from "./dossier";
import { pdfBytes } from "./exports";
import { layoutDocument } from "./layout";
import { generateScenario } from "./scenario";
import { workshopOptions as input } from "./testFixtures";
import { zipArchive } from "./zip";
import { mapRecipeColumns, parseRecipeCsv, validateImportRows } from "../../src/features/recipes/recipeCsv";
import type { Product } from "../../src/types";
import { parseSalesCsv } from "../../server/src/application/workspace/salesCsv";
import { inspectTicketZUpload } from "../../server/src/application/workspace/ticketZService";

describe("workshop document contracts", () => {
  it("exports unique day/article CSV quantities from served transaction lines, not forecasts", () => {
    const scenario = generateScenario({ ...input, services: "both", incident: "mixed" });
    const { docs, sales } = createDocuments(scenario);
    const rows = parseSalesCsv(salesCsv(sales), "2026-12-31").rows;
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
    for (const ticket of docs.filter(doc => doc.kind === "ticket")) {
      const day = scenario.days.find(d => d.date === ticket.date)!;
      const lines = day.services.flatMap(s => s.transactions.flatMap(t => t.lines));
      expect(ticket.sections[0].rows).toEqual(rows.filter(row => row.serviceDate === day.date).map(row => {
        const gross = lines.filter(line => recipeById(line.recipeId).name === row.itemName)
          .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
        return [row.itemName, String(row.quantity), money(gross)];
      }));
      const bilan = docs.find(doc => doc.kind === "sales" && doc.date === ticket.date)!;
      expect(bilan.sections).toHaveLength(day.services.length);
      day.services.forEach((service, index) => {
        const section = bilan.sections[index];
        expect(section.heading).toBe(`${service.name === "lunch" ? "Midi" : "Soir"} · ${service.covers} couverts du scénario`);
        for (const [item, , prepared, sold, retained, discarded] of section.rows) {
          const served = service.transactions.flatMap(t => t.lines).filter(l => recipeById(l.recipeId).name === item)
            .reduce((sum, line) => sum + line.quantity, 0);
          const discardedWaste = day.waste.find(w => w.kind === "unsold" && w.service === service.name && recipeById(w.recipeId!).name === item);
          expect(Number(sold)).toBe(served);
          expect(Number(discarded)).toBe(discardedWaste?.quantity ?? 0);
          expect(Number(prepared)).toBe(served + Number(retained) + Number(discarded));
        }
      });
    }
    const ready = readySales(sales, "2026-09-10");
    expect(parseSalesCsv(salesCsv(ready), "2026-09-10").rows.every(row => !row.error)).toBe(true);
    expect(readySales(sales, "2026-08-31")).toHaveLength(0);
  });
  it.each(["short_delivery", "unavailable", "late_delivery"] as const)("dates and links supplier documents and lots with %s", (incident) => {
    const scenario = generateScenario({ ...input, incident, days: 7 });
    const { docs } = createDocuments(scenario);
    expect(new Set(docs.map(d => d.id)).size).toBe(docs.length);
    expect(new Set(docs.filter(d => d.kind === "invoice").map(d => d.style))).toEqual(new Set(["market", "farm", "wholesale"]));
    for (const p of scenario.purchases) {
      const related = docs.filter(d => d.id.endsWith(p.id.slice(3)));
      expect(related.find(d => d.kind === "order")?.date).toBe(p.placedOn);
      if (p.receivedOn) {
        const delivery = related.find(d => d.kind === "delivery");
        expect(delivery?.date).toBe(p.receivedOn);
        expect(delivery?.sections.find(s => s.heading === "Lots reçus")?.rows ?? []).toEqual(p.lines.filter(l => l.received > 0).map(l => {
          const product = ingredientById(l.productId);
          return [product.name, `LOT-${p.id}-${product.id}`, offsetDate(p.receivedOn!, product.shelfLife - 1)];
        }));
        expect(related.find(d => d.kind === "invoice")?.date).toBe(p.invoiceOn);
        expect(p.placedOn < p.receivedOn && p.receivedOn < p.invoiceOn!).toBe(true);
        expect(related.some(d => d.kind === "credit")).toBe(p.lines.some(l => l.shortage));
      } else expect(related.map(d => d.kind)).toEqual(["order"]);
    }
    expect(JSON.stringify(docs)).not.toMatch(/ficti|démonstration/i);
  });
  it("documents actual productions, stock-only losses and source-linked refunds", () => {
    const scenario = generateScenario({ ...input, incident: "refund", days: 7 });
    const { docs } = createDocuments(scenario);
    for (const day of scenario.days.filter(d => d.open)) {
      const production = docs.find(d => d.kind === "production" && d.date === day.date)!;
      const total = production.sections.flatMap(s => s.rows).reduce((n, row) => n + Number(row[3]), 0);
      expect(total).toBe(day.services.flatMap(s => s.runs).reduce((n, r) => n + r.prepared, 0));
      const refunds = day.services.flatMap(s => s.transactions).filter(t => t.refund);
      expect(docs.filter(d => d.kind === "refund" && d.date === day.date)).toHaveLength(refunds.length);
      const losses = docs.find(d => d.kind === "waste" && d.date === day.date)!;
      expect(losses.sections[0].rows).toHaveLength(day.waste.filter(w => w.stockEffect).length);
      expect(losses.workflow).toContain("aucune seconde déduction");
      const preparationWaste = day.waste.find(w => w.kind === "preparation")!;
      expect(losses.sections[1].rows).toContainEqual([
        "Midi", `${recipeById(preparationWaste.recipeId!).name} / ${ingredientById(preparationWaste.productId!).name}`,
        `${number(preparationWaste.quantity)} ${preparationWaste.unit}`, preparationWaste.avoidable ? "Oui" : "Non comestible", "Préparation",
      ]);
    }
  });
  it("renders bounded pages for every template, including long identities and a 90-day calendar", () => {
    const { docs } = createDocuments(generateScenario({ ...input, days: 90, name: "Restaurant " + "W".repeat(69), incident: "mixed" }));
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
    const files = archiveFiles(scenario);
    expect(new Set(files.map(file => file.name)).size).toBe(files.length);
    const decoder = new TextDecoder();
    const decode = (name: string) => decoder.decode(files.find(file => file.name === name)!.bytes);
    expect(parseCheckpointFile(decode("stock-reprise.json"))).toEqual(scenario.checkpoint);
    expect(parseCheckpointFile(decode("scenario.json"))).toEqual(scenario.checkpoint);
    const journal = JSON.parse(decode("scenario.json"));
    expect(journal.catalog.version).toBe(2); expect(journal.catalog.recipes.length).toBeGreaterThan(3);
    const header = "service_date,item_name,quantity\r\n";
    const dailyRows: string[] = [];
    for (const day of scenario.days) {
      const csv = files.find(file => file.name === `${day.date}/ventes.csv`);
      if (!day.open) { expect(csv).toBeUndefined(); expect(files.some(f => f.name === `${day.date}/sans-ventes.md`)).toBe(true); }
      else {
        const text = decoder.decode(csv!.bytes);
        expect(text.startsWith(header)).toBe(true);
        expect(text.endsWith("\r\n")).toBe(true);
        const parsed = parseSalesCsv(text, "2026-12-31");
        expect(parsed.rows.every(row => row.serviceDate === day.date && !row.error)).toBe(true);
        dailyRows.push(text.slice(header.length));
      }
    }
    expect(decode("ventes-periode-complete.csv")).toBe(header + dailyRows.join(""));
    const closed = generateScenario({ ...input, start: "2026-09-07", days: 1 });
    expect(archiveFiles(closed).some(f => /(?:^|\/)ventes.*\.csv$/.test(f.name))).toBe(false);
  });
  it("imports the recipe CSVs through the Kookia validator with the same gross quantities as the PDFs", () => {
    const scenario = generateScenario({ ...input, days: 1, drinks: false, lossPercent: 17.5 });
    const { docs } = createDocuments(scenario);
    const files = archiveFiles(scenario).filter(f => f.name.startsWith("installation/recettes/"));
    const sheets = docs.filter(doc => doc.kind === "recipes");
    expect(files).toHaveLength(sheets.length);
    expect(files.some(file => file.name.endsWith("/expresso.csv"))).toBe(false);
    const products = scenario.catalog.ingredients as Product[];
    for (const file of files) {
      const recipeId = file.name.slice("installation/recettes/".length, -".csv".length);
      const pdf = sheets.find(doc => doc.title === `Fiche technique · ${recipeById(recipeId).name}`)!;
      const document = parseRecipeCsv(new TextDecoder().decode(file.bytes));
      const rows = mapRecipeColumns(document, { product: 0, quantity: 1, unit: 2 }).map(row =>
        ({ ...row, productId: products.find(product => product.name === row.source)?.id ?? "" }));
      const { ingredients, errors } = validateImportRows(rows, products);
      expect(errors).toEqual([]);
      expect(ingredients.map(({ productId, quantity }) => {
        const product = ingredientById(productId);
        return [product.name, number(quantity), product.unit];
      })).toEqual(pdf.sections[1].rows.map(([name, , gross, unit]) => [name, gross, unit]));
    }
  });
  it("writes coherent ZIP offsets, UTF-8 names, payloads and checksums", async () => {
    const files = [{ name: "épreuve.txt", bytes: new TextEncoder().encode("Contenu accentué") }];
    const archive = zipArchive(files);
    expect(archive.type).toBe("application/zip");
    const bytes = await archive.arrayBuffer(), view = new DataView(bytes);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const nameSize = view.getUint16(26, true);
    expect(new TextDecoder().decode(bytes.slice(30, 30 + nameSize))).toBe(files[0].name);
    expect(new TextDecoder().decode(bytes.slice(30 + nameSize, 30 + nameSize + files[0].bytes.length))).toBe("Contenu accentué");
    expect(view.getUint32(14, true)).toBe(0x16225e31);
    const end = bytes.byteLength - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 8, true)).toBe(1);
    const directory = view.getUint32(end + 16, true);
    expect(view.getUint32(directory, true)).toBe(0x02014b50);
    expect(view.getUint32(directory + 16, true)).toBe(0x16225e31);
  });
});
