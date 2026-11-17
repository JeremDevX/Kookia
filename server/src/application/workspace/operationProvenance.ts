export const simulationActor = "restaurant-simulation:v1";

export function isSimulationServiceDay(day: { source: string }, mode: string) {
  return mode === "demo" || day.source === "demo_simulation";
}

export function isSimulationSale(sale: { source: string; serviceDay: { source: string } }, mode: string) {
  return sale.source === "demo_simulation" || isSimulationServiceDay(sale.serviceDay, mode);
}

export function isSimulationReceipt(receipt: { simulated: boolean; provenance: string }, mode: string) {
  return mode === "demo" || receipt.simulated || receipt.provenance === "demo_simulation";
}
