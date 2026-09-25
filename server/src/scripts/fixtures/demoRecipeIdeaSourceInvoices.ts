import { createHash } from "node:crypto";
import type { SourceInvoice } from "../sourceInvoices.js";

const examples = [
  { key: "flour", date: "2026-09-19", title: "EXEMPLE FICTIF — épicerie", supplier: "Fournisseur fictif — épicerie",
    name: "Farine T55", quantity: 8, unit: "kg" as const, unitPrice: 1, sourceQuantityText: "8 kg", sourceLineNumber: 4 },
  { key: "eggs", date: "2026-09-20", title: "EXEMPLE FICTIF — produits frais", supplier: "Fournisseur fictif — produits frais",
    name: "Oeufs", quantity: 30, unit: "pcs" as const, unitPrice: 0.2, sourceQuantityText: "30 pcs", sourceLineNumber: 4 },
  { key: "chicken", date: "2026-09-21", title: "EXEMPLE FICTIF — volaille", supplier: "Fournisseur fictif — volaille",
    name: "Poulet Fermier", quantity: 8, unit: "kg" as const, unitPrice: 9, sourceQuantityText: "8 kg", sourceLineNumber: 4 },
  { key: "cream", date: "2026-09-22", title: "EXEMPLE FICTIF — produits laitiers", supplier: "Fournisseur fictif — produits laitiers",
    name: "Crème Fraîche", quantity: 6, unit: "L" as const, unitPrice: 4.5, sourceQuantityText: "6 L", sourceLineNumber: 5 },
  { key: "pasta", date: "2026-09-23", title: "EXEMPLE FICTIF — pâtes sèches", supplier: "Fournisseur fictif — épicerie",
    name: "Pâtes sèches", quantity: 5, unit: "kg" as const, unitPrice: 1.5, sourceQuantityText: "5 kg", sourceLineNumber: 4 },
  { key: "mozzarella", date: "2026-09-24", title: "EXEMPLE FICTIF — fromage", supplier: "Fournisseur fictif — produits laitiers",
    name: "Mozzarella", quantity: 4, unit: "kg" as const, unitPrice: 8, sourceQuantityText: "4 kg", sourceLineNumber: 4 },
];

export function createDemoRecipeIdeaSourceInvoices(): SourceInvoice[] {
  return examples.map((example) => {
    const content = `Fiche pédagogique fictive : ${example.quantity} ${example.unit} de ${example.name}. Aucune pièce fournisseur réelle, réception, recette ou production n’est attestée.`;
    const id = createHash("sha256").update(`kookia-demo-recipe-idea-source:v2:${example.key}`).digest("hex").slice(0, 24);
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
