import { describe, expect, it } from "vitest";
import { parseSourceInvoice, readSourceInvoices } from "./sourceInvoices.js";

const metadata = `# Fournisseur — facture 123\n\n- Date décalée de la pièce (démonstration) : 2026-09-22\n- Date (pièce d’origine) : 2021-12-29\n- Fournisseur : Fournisseur\n- Statut : OCR à vérifier\n\n`;

describe("source invoice extraction", () => {
  it("keeps quantified table lines only when quantity, unit price and amount agree", () => {
    const invoice = parseSourceInvoice("factures/123.md", `${metadata}| Produit | Quantité facturée | Prix unitaire HT | Montant HT |\n| --- | ---: | ---: | ---: |\n| Farine | 2,000 KG | 3,50 € | 7,00 € |\n| Beurre | 2 PCE | 2,00 € | 7,00 € |\n| Café | conditionnement 1 kg | 5,00 € | 5,00 € |\n`);
    expect(invoice.date).toBe("2026-09-22");
    expect(invoice.originalDate).toBe("2021-12-29");
    expect(invoice.stockLines).toMatchObject([{ name: "Farine", quantity: 2, unit: "kg", unitPrice: 3.5,
      sourceQuantityText: "2,000 KG", priceBasis: "stated_unit_price", priceTaxBasis: "HT" }]);
  });

  it("retains credit notes for review without creating stock entries", () => {
    const invoice = parseSourceInvoice("factures/credit.md", `${metadata.replace("facture", "avoir")}| Produit | Quantité | Prix unitaire HT | Montant HT |\n| --- | ---: | ---: | ---: |\n| Farine | 2 kg | 3,50 € | 7,00 € |\n`);
    expect(invoice.type).toBe("credit");
    expect(invoice.stockLines).toEqual([]);
  });

  it("extracts explicit bullet calculations and derives unit price from a line amount", () => {
    const invoice = parseSourceInvoice("factures/456.md", `${metadata}- Merguez : 2,880 kg × 8,50 €/kg = 24,48 €\n\n| Vin | Quantité | Montant HT après remise |\n| --- | ---: | ---: |\n| AOP Saint-Joseph, BIB | 2 | 20,00 € |\n`);
    expect(invoice.stockLines).toMatchObject([
      { name: "AOP Saint-Joseph, BIB", quantity: 2, unit: "pcs", unitPrice: 10, priceTaxBasis: "HT" },
      { name: "Merguez", quantity: 2.88, unit: "kg", unitPrice: 8.5, priceTaxBasis: "unknown" },
    ]);
  });

  it("accepts explicit package quantities without treating a package size as a receipt", () => {
    const invoice = parseSourceInvoice("factures/packages.md", `${metadata}| Produit | Quantité | Montant TTC |\n| --- | ---: | ---: |\n| Œufs, boîte de 12 | 1 boîte | 2,04 € |\n| Farine, sachet 400 g | 4 sachets | 8,00 € |\n| Cuisse de canard | 14,635 kg (20 pièces) | 76,10 € |\n| Coca-Cola, carton de 24 | carton de 24 | 12,00 € |\n`);
    expect(invoice.stockLines).toMatchObject([
      { name: "Œufs, boîte de 12", quantity: 1, unit: "pcs", unitPrice: 2.04, priceTaxBasis: "TTC" },
      { name: "Farine, sachet 400 g", quantity: 4, unit: "pcs", unitPrice: 2, priceTaxBasis: "TTC" },
      { name: "Cuisse de canard", quantity: 14.635, unit: "kg", unitPrice: 5.1999, priceTaxBasis: "TTC" },
    ]);
  });

  it("derives a comparable HT unit price when a stated TTC price and HT amount coexist", () => {
    const invoice = parseSourceInvoice("factures/tax.md", `${metadata}| Produit | Quantité | Prix unitaire TTC | Montant HT | Montant TTC |\n| --- | ---: | ---: | ---: | ---: |\n| Pâtes sèches | 2 kg | 6,00 € | 10,00 € | 12,00 € |\n`);
    expect(invoice.stockLines).toMatchObject([{ quantity: 2, unit: "kg", unitPrice: 5,
      priceBasis: "derived_from_line_amount_ht", priceTaxBasis: "HT" }]);
  });

  it("covers every prepared source sheet with a distinct identifier", () => {
    const invoices = readSourceInvoices();
    expect(invoices).toHaveLength(431);
    expect(new Set(invoices.map((invoice) => invoice.id)).size).toBe(431);
  });
});
