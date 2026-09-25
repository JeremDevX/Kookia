import { parseSourceInvoice, type SourceInvoice } from "../sourceInvoices.js";

const examples = [
  { key: "flour", date: "2026-09-19", supplier: "Fournisseur fictif — épicerie", name: "Farine T55", quantity: "8 kg", price: 1 },
  { key: "tomatoes", date: "2026-09-20", supplier: "Fournisseur fictif — légumes", name: "Tomates", quantity: "8 kg", price: 2 },
  { key: "mozzarella", date: "2026-09-21", supplier: "Fournisseur fictif — produits laitiers", name: "Mozzarella", quantity: "4 kg", price: 8 },
  { key: "ham", date: "2026-09-22", supplier: "Fournisseur fictif — charcuterie", name: "Jambon cru", quantity: "2 kg", price: 10 },
  { key: "mushrooms", date: "2026-09-23", supplier: "Fournisseur fictif — légumes", name: "Champignons", quantity: "5 kg", price: 3 },
  { key: "eggs", date: "2026-09-24", supplier: "Fournisseur fictif — produits frais", name: "Oeufs", quantity: "30 pcs", price: 0.2 },
];

export function createDemoRecipeIdeaSourceInvoices(): SourceInvoice[] {
  return examples.map((example) => {
    const amount = Number(example.quantity.split(" ")[0]) * example.price;
    const content = `# EXEMPLE FICTIF — ${example.key}\n- Date décalée de la pièce (démonstration) : ${example.date}\n` +
      `- Fournisseur : ${example.supplier}\n- Statut : Exemple fictif — aucun achat réel\n` +
      "| Désignation | Quantité facturée | Prix unitaire HT | Montant HT |\n| --- | ---: | ---: | ---: |\n" +
      `| ${example.name} | ${example.quantity} | ${example.price.toFixed(2)} € | ${amount.toFixed(2)} € |\n` +
      "\nAucune facture, réception, recette ou production réelle n’est attestée.\n";
    return parseSourceInvoice(`fixtures/demo-recipe-idea-${example.key}.md`, content);
  });
}
