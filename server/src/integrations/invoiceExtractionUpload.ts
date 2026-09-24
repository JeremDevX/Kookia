import { inspectTicketFile, type TicketFileInspection } from "./ticketFile.js";

export function inspectInvoiceExtractionUpload(contentType: string | undefined, input: unknown): TicketFileInspection {
  const result = inspectTicketFile(contentType, input);
  if (result.valid) return result;
  return {
    ...result,
    code: result.code.replace("TICKET", "INVOICE"),
    message: result.message.replace("Ticket Z", "la pièce fournisseur"),
  };
}
