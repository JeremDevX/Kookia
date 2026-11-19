import type { InvoiceStockEffect } from "../../../shared/invoice";
import { ApiError } from "../../config/api";

const feedback: Record<InvoiceStockEffect, { title: string; message: string }> = {
  none: { title: "Pièce rapprochée", message: "Le rapprochement a été enregistré. Le stock est inchangé." },
  recorded: { title: "Réception enregistrée", message: "Les quantités ont été ajoutées au stock." },
  demo_simulation: { title: "Réception simulée", message: "Les quantités ont été ajoutées au stock du scénario." },
};

export function invoiceReceiptFeedback(effect: InvoiceStockEffect, clientPresentation: boolean) {
  return feedback[clientPresentation && effect === "demo_simulation" ? "recorded" : effect];
}

export function invoiceReceiptError(error: unknown, fallback: string, clientPresentation: boolean) {
  if (clientPresentation && error instanceof ApiError
    && ["DEMO_INVOICE_IN_OPERATIONAL_WORKSPACE", "SIMULATION_IN_OPERATIONAL_WORKSPACE"].includes(error.details.code)) {
    return "Cette pièce ne peut pas servir à enregistrer une réception. Utilisez une autre facture.";
  }
  return error instanceof Error ? error.message : fallback;
}
