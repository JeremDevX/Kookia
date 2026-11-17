import type { InvoiceStockEffect } from "../../../shared/invoice";

export const invoiceReceiptFeedback: Record<InvoiceStockEffect, { title: string; message: string }> = {
  none: { title: "Pièce rapprochée", message: "Le rapprochement a été enregistré. Le stock est inchangé." },
  recorded: { title: "Réception enregistrée", message: "Les quantités ont été ajoutées au stock." },
  demo_simulation: { title: "Réception simulée", message: "Les quantités ont été ajoutées au stock du scénario." },
};
