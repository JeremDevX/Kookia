export type ReceiptStatusFilter = "all" | "pending" | "received";

export function matchesReceiptStatus(status: string, filter: ReceiptStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return ["validated", "partially_received", "simulated", "simulated_partially_received"].includes(status);
  return status === "received" || status === "simulated_received";
}
