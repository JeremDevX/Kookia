import { Prisma } from "@prisma/client";
import { WorkspaceError } from "./catalogService.js";
import { invoiceSchema } from "./invoiceService.js";

export const invoiceKey = (value: string) => value.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleUpperCase("fr-FR");

export async function checkInvoiceDuplicates(tx: Prisma.TransactionClient, restaurantId: string, invoiceId: string,
  supplierId: string | undefined, reference: string, confirmed: Array<{ id: string; version: string }> = []) {
  if (!supplierId) return;
  const [documents, receipts] = await Promise.all([
    tx.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "invoice:" } }, select: { data: true, revision: true } }),
    tx.purchaseReceipt.findMany({ where: { restaurantId }, select: { invoiceDocumentId: true } }),
  ]);
  const receiptCounts = new Map<string, number>();
  for (const receipt of receipts) receiptCounts.set(receipt.invoiceDocumentId, (receiptCounts.get(receipt.invoiceDocumentId) ?? 0) + 1);
  const duplicates = documents.flatMap((document) => {
    const invoice = invoiceSchema.parse(document.data);
    return invoice.id !== invoiceId && invoice.source === "manual" && invoice.supplierId === supplierId &&
      invoiceKey(invoice.reference) === invoiceKey(reference) && (invoice.status === "received" || receiptCounts.has(invoice.id))
      ? [{ id: invoice.id, version: `${document.revision}:${receiptCounts.get(invoice.id) ?? 0}`, date: invoice.date }] : [];
  }).sort((a, b) => a.id.localeCompare(b.id));
  if (duplicates.length > 100) throw new WorkspaceError(409, "TOO_MANY_DUPLICATE_INVOICES",
    "Plus de 100 factures de ce fournisseur portent cette référence. Vérifiez leur historique et contactez l’assistance avant de poursuivre.");
  const accepted = [...confirmed].sort((a, b) => a.id.localeCompare(b.id));
  if (duplicates.length && (accepted.length !== duplicates.length || duplicates.some((item, index) =>
    item.id !== accepted[index]?.id || item.version !== accepted[index]?.version))) {
    throw new WorkspaceError(409, "POSSIBLE_DUPLICATE_INVOICE", "Une facture de ce fournisseur porte déjà cette référence. Vérifiez les livraisons, puis recommencez si nécessaire.", duplicates);
  }
}
