import { expect, it } from "vitest";
import { describeInvoiceFile, invoiceExtractionPayloadSchema, unconfiguredInvoiceExtractionAdapter } from "./invoiceExtractionAdapter.js";

const bytes = Buffer.from("synthetic invoice fixture; no real supplier data");
const file = describeInvoiceFile(bytes, "application/pdf");
const line = { name: "Farine fixture", quantity: 2, unit: "kg", unitPrice: 3.5, sourceQuantityText: "2 kg",
  sourceLineNumber: 1, priceBasis: "stated_unit_price", priceTaxBasis: "HT" } as const;

it("bounds invoice files and accepts only supported MIME types", () => {
  expect(file).toMatchObject({ byteSize: bytes.byteLength, mimeType: "application/pdf" });
  expect(() => describeInvoiceFile(Buffer.alloc(0), "application/pdf")).toThrow();
  expect(() => describeInvoiceFile(Buffer.alloc(4 * 1024 * 1024 + 1), "application/pdf")).toThrow();
  expect(() => describeInvoiceFile(bytes, "text/plain")).toThrow();
});

it("validates normalized extraction candidates without accepting duplicate or invalid source lines", () => {
  const payload = { sourceFileHash: file.sha256, title: "Facture fixture", date: "2026-09-20",
    supplier: "Fournisseur fictif", type: "invoice", extractedText: "Farine · 2 kg · 3,50 €",
    stockLines: [line] };
  expect(invoiceExtractionPayloadSchema.safeParse(payload).success).toBe(true);
  expect(invoiceExtractionPayloadSchema.safeParse({ ...payload, stockLines: [line, line] }).success).toBe(false);
  expect(invoiceExtractionPayloadSchema.safeParse({ ...payload, date: "20/09/2026" }).success).toBe(false);
  expect(invoiceExtractionPayloadSchema.safeParse({ ...payload, unexpected: true }).success).toBe(false);
});

it("keeps OCR explicitly unavailable until a provider is configured", async () => {
  await expect(unconfiguredInvoiceExtractionAdapter.extract({ file, bytes }))
    .resolves.toEqual({ status: "unavailable", reason: "not_configured" });
});
