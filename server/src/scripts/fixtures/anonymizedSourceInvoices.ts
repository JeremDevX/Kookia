import { createHash } from "node:crypto";
import type { SourceInvoice } from "../sourceInvoices.js";

const day = 24 * 60 * 60 * 1000;

function dateAt(start: string, offset: number) {
  return new Date(Date.parse(`${start}T00:00:00.000Z`) + offset * day).toISOString().slice(0, 10);
}

export function createAnonymizedSourceInvoices(): SourceInvoice[] {
  const periods = [
    { start: "2023-05-03", count: 3 },
    { start: "2024-01-01", count: 57 },
    { start: "2025-01-01", count: 184 },
    { start: "2026-03-22", count: 186 },
  ];
  const invoices: SourceInvoice[] = [];
  let sequence = 0;

  for (const period of periods) {
    for (let offset = 0; offset < period.count; offset += 1) {
      sequence += 1;
      const date = dateAt(period.start, offset);
      const type: SourceInvoice["type"] = sequence >= 4 && sequence <= 18
        ? "credit"
        : sequence === 19 ? "delivery" : "invoice";
      const stockLines = type === "invoice" && !date.startsWith("2023") && sequence % 3 === 0
        ? [{ name: "Tomates", quantity: 8, unit: "kg" as const, unitPrice: 2.25,
          sourceQuantityText: "8 kg", sourceLineNumber: 8, priceBasis: "stated_unit_price" as const,
          priceTaxBasis: "HT" as const }]
        : [];
      const key = String(sequence).padStart(24, "0");
      invoices.push({
        id: key,
        file: `fixtures/anonymized-${sequence}.md`,
        contentHash: createHash("sha256").update(`synthetic-invoice-${sequence}`).digest("hex"),
        title: `Pièce synthétique ${sequence}`,
        date,
        originalDate: null,
        supplier: "Fournisseur synthétique",
        type,
        status: "Fixture anonymisée, à confirmer",
        content: "Données fictives générées pour les tests isolés.",
        stockLines,
      });
    }
  }

  sequence += 1;
  invoices.push({
    id: String(sequence).padStart(24, "0"),
    file: `fixtures/anonymized-${sequence}.md`,
    contentHash: createHash("sha256").update(`synthetic-invoice-${sequence}`).digest("hex"),
    title: `Pièce synthétique ${sequence}`,
    date: null,
    originalDate: null,
    supplier: "Fournisseur synthétique",
    type: "invoice",
    status: "Date à confirmer",
    content: "Données fictives générées pour les tests isolés.",
    stockLines: [],
  });

  return invoices;
}
