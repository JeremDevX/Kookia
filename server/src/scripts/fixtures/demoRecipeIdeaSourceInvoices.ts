import { createHash } from "node:crypto";
import type { SourceInvoice } from "../sourceInvoices.js";

const examples = [
  { key: "vegetables", date: "2026-09-21", title: "EXEMPLE FICTIF — champignons",
    supplier: "Fournisseur fictif — légumes", name: "Champignons", quantity: 8,
    unit: "kg" as const, unitPrice: 3.5, sourceQuantityText: "8 kg", sourceLineNumber: 4 },
  { key: "dairy", date: "2026-09-22", title: "EXEMPLE FICTIF — produits laitiers",
    supplier: "Fournisseur fictif — produits laitiers", name: "Crème Fraîche", quantity: 6,
    unit: "L" as const, unitPrice: 4.5, sourceQuantityText: "6 L", sourceLineNumber: 5 },
];

export function createDemoRecipeIdeaSourceInvoices(): SourceInvoice[] {
  return examples.map((example) => {
    const content = `Fiche pédagogique fictive : ${example.quantity} ${example.unit} de ${example.name}. Aucune pièce fournisseur réelle, réception, recette ou production n’est attestée.`;
    const id = createHash("sha256").update(`kookia-demo-recipe-idea-source:v1:${example.key}`).digest("hex").slice(0, 24);
    return {
      id,
      file: `fixtures/demo-recipe-idea-${example.key}.md`,
      contentHash: createHash("sha256").update(content).digest("hex"),
      title: example.title,
      date: example.date,
      originalDate: null,
      supplier: example.supplier,
      type: "invoice",
      status: "Exemple fictif — aucun achat ni plat observé",
      content,
      stockLines: [{ name: example.name, quantity: example.quantity, unit: example.unit,
        unitPrice: example.unitPrice, sourceQuantityText: example.sourceQuantityText,
        sourceLineNumber: example.sourceLineNumber, priceBasis: "stated_unit_price", priceTaxBasis: "unknown" }],
    };
  });
}
