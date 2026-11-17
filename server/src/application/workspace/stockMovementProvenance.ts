import { isSimulationReceipt, simulationActor } from "./operationProvenance.js";

export interface StockMovementProvenanceInput {
  actorId: string; reason: string; operationId: string;
  purchaseReceiptLine: { receipt: { simulated: boolean; provenance: string } } | null;
}

export const stockReceiptProvenance = { select: { receipt: { select: { simulated: true, provenance: true } } } } as const;
export const simulatedInvoiceOperationPrefix = "simulated-invoice:";

export function isSimulationStockMovement(movement: StockMovementProvenanceInput, workspaceMode: string) {
  return workspaceMode === "demo" || movement.actorId === simulationActor ||
    movement.reason.startsWith("simulation_") || movement.reason === "invoice_import_demo" ||
    movement.reason === "simulated_consumption" || movement.reason === "simulated_unit_rounding" ||
    movement.operationId.startsWith("restaurant-simulation-v1:") ||
    movement.operationId.startsWith(simulatedInvoiceOperationPrefix) ||
    (movement.purchaseReceiptLine !== null && isSimulationReceipt(movement.purchaseReceiptLine.receipt, workspaceMode));
}
