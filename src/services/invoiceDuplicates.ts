import { ApiError } from "../config/api";

export function confirmInvoiceDuplicates(error: unknown) {
  if (!(error instanceof ApiError) || error.details.code !== "POSSIBLE_DUPLICATE_INVOICE" || !error.details.duplicates?.length) return null;
  const duplicates = error.details.duplicates;
  const dates = duplicates.map((item) => `• Facture du ${item.date || "date inconnue"}`).join("\n");
  return window.confirm(`${error.message}\n\n${dates}\n\nConfirmez-vous qu’il s’agit d’une autre livraison à enregistrer ?`)
    ? duplicates.map(({ id, version }) => ({ id, version })) : null;
}
