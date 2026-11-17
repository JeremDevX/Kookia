import type { Invoice } from "../../../shared/invoice";
import { formatLocalISODate } from "../../utils/date";

export function createManualInvoiceDraft(): Invoice {
  return { id: crypto.randomUUID(), reference: "", date: formatLocalISODate(), lines: [],
    status: "draft", source: "manual", revision: 0 };
}
