import type { InvoiceExtractionAdapter } from "./invoiceExtractionAdapter.js";

const demoFixtureSha256 = "b586edace9b3fea9aa5362f00ffc431a73819daba990c512187dad203c8a7469";

export const localDemoInvoiceExtractionAdapter: InvoiceExtractionAdapter = {
  provider: "local_demo_fixture",
  async extract({ file }) {
    if (file.mimeType !== "application/pdf" || file.sha256 !== demoFixtureSha256)
      return { status: "unavailable", reason: "not_configured" };
    return {
      status: "ok",
      payload: {
        sourceFileHash: file.sha256,
        title: "Facture DEMO-2026-09-01",
        date: "2026-09-20",
        supplier: "Maison Potager Demo",
        type: "invoice",
        extractedText: "Facture fictive du 20/09/2026. Tomates rondes : 2 kg a 3,50 EUR/kg, total 7,00 EUR HT.",
        stockLines: [{ name: "Tomates rondes (origine fictive)", quantity: 2, unit: "kg", unitPrice: 3.5,
          sourceQuantityText: "2 kg", sourceLineNumber: 1, priceBasis: "stated_unit_price", priceTaxBasis: "HT" }],
      },
    };
  },
};
