import { Prisma, type PrismaClient } from "@prisma/client";
import type { DeclaredWasteSummary } from "../../../../shared/declaredWaste.js";
import { simulationActor } from "./operationProvenance.js";
import { isSimulationStockMovement, stockReceiptProvenance } from "./stockMovementProvenance.js";
const include = { product: { select: { name: true } }, production: { select: { recipeName: true, actorId: true } },
  stockMovement: { include: { product: { select: { name: true, unit: true } },
    lotAllocations: { include: { lot: true } }, purchaseReceiptLine: stockReceiptProvenance } } } satisfies Prisma.WasteRecordInclude;
export type WasteReadRow = Prisma.WasteRecordGetPayload<{ include: typeof include }>;
export function readDeclaredWaste(db: PrismaClient | Prisma.TransactionClient, restaurantId: string, from: Date, to: Date) {
  return db.wasteRecord.findMany({ where: { restaurantId, serviceDate: { gte: from, lt: to } }, include, orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }] });
}

function wasteLotCost(row: WasteReadRow) {
  const allocations = row.stockMovement?.lotAllocations;
  if (!allocations?.length) return null;
  let allocated = new Prisma.Decimal(0);
  let cost = new Prisma.Decimal(0);
  for (const { quantity, lot } of allocations) {
    if (lot.unitCost === null) return null;
    allocated = allocated.plus(quantity);
    cost = cost.plus(quantity.mul(lot.unitCost));
  }
  return allocated.eq(row.quantity) ? cost.toNumber() : null;
}

export function summarizeDeclaredWaste(rows: WasteReadRow[], from: string, to: string, mode: "operational" | "demo"): DeclaredWasteSummary {
  const summary: DeclaredWasteSummary = { records: [], totals: [], excludedSimulationCount: 0 };
  const totals = new Map<string, DeclaredWasteSummary["totals"][number]>();
  for (const row of rows) {
    const serviceDate = row.serviceDate.toISOString().slice(0, 10);
    if (serviceDate < from || serviceDate > to) continue;
    if (mode === "demo" || row.actorId === simulationActor || row.production?.actorId === simulationActor ||
      (row.stockMovement && isSimulationStockMovement(row.stockMovement, mode))) { summary.excludedSimulationCount++; continue; }
    const knownCost = wasteLotCost(row);
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
