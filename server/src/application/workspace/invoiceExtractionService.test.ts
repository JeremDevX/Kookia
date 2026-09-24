import { expect, it } from "vitest";
import { WorkspaceError } from "./catalogService.js";
import { mapInvoiceExtractionToSourceDocument } from "./invoiceExtractionService.js";
import { describeInvoiceFile } from "../../integrations/invoiceExtractionAdapter.js";

const bytes = Buffer.from("synthetic invoice fixture; no real supplier data");
const file = describeInvoiceFile(bytes, "image/jpeg");
const payload = { sourceFileHash: file.sha256, title: "Facture fixture", date: "2026-09-20",
  supplier: "Fournisseur fictif", type: "invoice", extractedText: "Facture fixture, à vérifier",
  stockLines: [{ name: "Farine fixture", quantity: 2, unit: "kg", unitPrice: 3.5, sourceQuantityText: "2 kg",
    sourceLineNumber: 1, priceBasis: "stated_unit_price", priceTaxBasis: "HT" }] };

it("maps an extraction to a tenant-specific, correction-required C1 source candidate", () => {
  const candidate = mapInvoiceExtractionToSourceDocument("owner-1", file, payload);
  expect(candidate).toMatchObject({ contentHash: file.sha256, date: "2026-09-20", originalDate: "2026-09-20",
    status: "Extraction candidate à vérifier", stockLines: [{ sourceLineNumber: 1, quantity: 2 }] });
  expect(candidate.id).toMatch(/^[a-f0-9]{24}$/);
  expect(mapInvoiceExtractionToSourceDocument("owner-1", file, payload).id).toBe(candidate.id);
  expect(mapInvoiceExtractionToSourceDocument("owner-2", file, payload).id).not.toBe(candidate.id);
  expect(JSON.stringify(candidate)).not.toContain(bytes.toString());
});

it("rejects a response for another file and never maps credit lines into stock candidates", () => {
  expect(() => mapInvoiceExtractionToSourceDocument("owner-1", file, { ...payload, sourceFileHash: "a".repeat(64) }))
    .toThrow(WorkspaceError);
  expect(mapInvoiceExtractionToSourceDocument("owner-1", file, { ...payload, type: "credit" }).stockLines).toEqual([]);
});
