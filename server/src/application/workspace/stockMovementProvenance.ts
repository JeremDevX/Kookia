export interface StockMovementProvenanceInput {
  actorId: string; reason: string; operationId: string;
  purchaseReceiptLine: { receipt: { simulated: boolean } } | null;
}

export function isSimulationStockMovement(movement: StockMovementProvenanceInput, workspaceMode: string) {
  return workspaceMode === "demo" || movement.actorId === "restaurant-simulation:v1" ||
    movement.reason.startsWith("simulation_") || movement.reason === "invoice_import_demo" ||
    movement.operationId.startsWith("restaurant-simulation-v1:") || movement.purchaseReceiptLine?.receipt.simulated === true;
}
