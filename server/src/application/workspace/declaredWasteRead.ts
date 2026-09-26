import type { Prisma, PrismaClient } from "@prisma/client";
import type { DeclaredWasteSummary } from "../../../../shared/declaredWaste.js";
import { isSimulationStockMovement } from "./stockMovementProvenance.js";
const include = { product: { select: { name: true } }, production: { select: { recipeName: true, actorId: true } },
  stockMovement: { include: { lotAllocations: { include: { lot: true } }, purchaseReceiptLine: { select: { receipt: { select: { simulated: true } } } } } } } satisfies Prisma.WasteRecordInclude;
export type WasteReadRow = Prisma.WasteRecordGetPayload<{ include: typeof include }>;
export function readDeclaredWaste(db: PrismaClient | Prisma.TransactionClient, restaurantId: string, from: Date, to: Date) {
  return db.wasteRecord.findMany({ where: { restaurantId, serviceDate: { gte: from, lt: to } }, include, orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }] });
}
export function summarizeDeclaredWaste(rows: WasteReadRow[], from: string, to: string, mode: "operational" | "demo"): DeclaredWasteSummary {
  const summary: DeclaredWasteSummary = { records: [], totals: [], excludedSimulationCount: 0 };
  const totals = new Map<string, DeclaredWasteSummary["totals"][number]>();
  for (const row of rows) {
    const serviceDate = row.serviceDate.toISOString().slice(0, 10);
    if (serviceDate < from || serviceDate > to) continue;
    if (mode === "demo" || row.production?.actorId === "restaurant-simulation:v1" ||
      (row.stockMovement && isSimulationStockMovement(row.stockMovement, mode))) { summary.excludedSimulationCount++; continue; }
    const sources = row.stockMovement?.lotAllocations ?? [];
    const priced = sources.length > 0 && sources.every((entry) => entry.lot.unitCost !== null) &&
      Math.abs(sources.reduce((sum, entry) => sum + Number(entry.quantity), 0) - Number(row.quantity)) < 0.0005;
    const knownCost = row.stockMovement && priced ? sources.reduce((sum, entry) => sum + Number(entry.quantity) * Number(entry.lot.unitCost), 0) : null;
    summary.records.push({ id: row.id, operationId: row.operationId, serviceDate, serviceSlot: row.serviceSlot, kind: row.kind,
      avoidability: row.avoidability, productId: row.productId, productName: row.product?.name ?? null,
      productionId: row.productionId, preparationName: row.production?.recipeName ?? null, lotId: row.lotId,
      quantity: Number(row.quantity), unit: row.unit, note: row.note, stockMovementId: row.stockMovementId, knownCost });
    const key = `${row.kind}:${row.avoidability}:${row.unit}`;
    const group = totals.get(key) ?? { kind: row.kind, avoidability: row.avoidability, unit: row.unit, quantity: 0, recordCount: 0 };
    group.quantity = Math.round((group.quantity + Number(row.quantity)) * 1000) / 1000; group.recordCount++;
    totals.set(key, group);
  }
  summary.totals = [...totals.values()];
  return summary;
}
