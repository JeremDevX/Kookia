import { describe, expect, it } from "vitest";
import { parseSourceInvoice, readSourceInvoices } from "./sourceInvoices.js";

const metadata = `# Fournisseur — facture 123\n\n- Date décalée de la pièce (démonstration) : 2026-09-22\n- Date (pièce d’origine) : 2021-12-29\n- Fournisseur : Fournisseur\n- Statut : OCR à vérifier\n\n`;

describe("source invoice extraction", () => {
  it("keeps quantified table lines only when quantity, unit price and amount agree", () => {
    const invoice = parseSourceInvoice("factures/123.md", `${metadata}| Produit | Quantité facturée | Prix unitaire HT | Montant HT |\n| --- | ---: | ---: | ---: |\n| Farine | 2,000 KG | 3,50 € | 7,00 € |\n| Beurre | 2 PCE | 2,00 € | 7,00 € |\n| Café | conditionnement 1 kg | 5,00 € | 5,00 € |\n`);
    expect(invoice.date).toBe("2026-09-22");
    expect(invoice.originalDate).toBe("2021-12-29");
    expect(invoice.stockLines).toEqual([{ name: "Farine", quantity: 2, unit: "kg", unitPrice: 3.5 }]);
  });

  it("retains credit notes for review without creating stock entries", () => {
    const invoice = parseSourceInvoice("factures/credit.md", `${metadata.replace("facture", "avoir")}| Produit | Quantité | Prix unitaire HT | Montant HT |\n| --- | ---: | ---: | ---: |\n| Farine | 2 kg | 3,50 € | 7,00 € |\n`);
    expect(invoice.type).toBe("credit");
    expect(invoice.stockLines).toEqual([]);
  });

  it("covers every prepared source sheet with a distinct identifier", () => {
    const invoices = readSourceInvoices();
    expect(invoices).toHaveLength(431);
    expect(new Set(invoices.map((invoice) => invoice.id)).size).toBe(431);
  });
});
