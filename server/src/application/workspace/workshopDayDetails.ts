import { serviceSlots, type ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { WorkshopDayDetails } from "../../../../shared/workshopControl.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { simulationActor } from "./operationProvenance.js";
import { workshopOperationsMetadataSchema } from "./workshopOperationsInput.js";
import { workshopOperationsKind } from "./workshopOperationsService.js";
import { workshopStockActor, workshopStockBalancesKind, workshopStockBalancesSchema, workshopStockKind } from "./workshopStockService.js";
import { workshopDayKind } from "./workshopWorkspace.js";
import { WorkspaceError } from "./workspaceError.js";

const validSlot = (slot: string | null): slot is ServiceSlot => serviceSlots.some(value => value === slot);
const lossLabels: Record<string, string> = {
  raw: "Perte de produit", preparation: "Perte en préparation", unsold: "Invendu", plate_return: "Retour d’assiette",
};

async function readWorkshopStock(restaurantId: string, kind: string, data: unknown): Promise<WorkshopDayDetails["stock"]> {
  const balances = workshopStockBalancesSchema.safeParse(data).data ?? [];
  const rows = new Map<string, WorkshopDayDetails["stock"][number]>(balances.map(balance => [balance.productId, {
    name: balance.name, unit: balance.unit, supplier: balance.supplier,
    opening: balance.openingMilli / 1000, closing: balance.closingMilli / 1000,
    received: 0, consumed: 0, lost: 0, adjustment: 0,
  }]));
  const movements = await prisma.stockMovement.findMany({ where: {
    restaurantId, actorId: workshopStockActor, operationId: { startsWith: `${kind}:` },
    reason: { in: ["simulation_restock", "simulated_consumption", "simulation_loss", "simulation_stock_adjustment"] },
  }, select: { productId: true, productNameSnapshot: true, productUnitSnapshot: true, reason: true, delta: true } });
  for (const movement of movements) {
    let row = rows.get(movement.productId);
    if (!row) {
      if (!movement.productNameSnapshot || !movement.productUnitSnapshot) continue;
      // Older markers retained the movement trail and a digest of the opening and closing balances.
      row = { name: movement.productNameSnapshot, unit: movement.productUnitSnapshot, supplier: null,
        opening: null, closing: null, received: 0, consumed: 0, lost: 0, adjustment: 0 };
      rows.set(movement.productId, row);
    }
    const milli = movement.delta.mul(1000).toNumber();
    switch (movement.reason) {
      case "simulation_restock": row.received += milli; break;
      case "simulated_consumption": row.consumed -= milli; break;
      case "simulation_loss": row.lost -= milli; break;
      case "simulation_stock_adjustment": row.adjustment += milli; break;
    }
  }
  return [...rows.values()].map(row => ({
    ...row, received: row.received / 1000, consumed: row.consumed / 1000, lost: row.lost / 1000, adjustment: row.adjustment / 1000,
  })).sort((a, b) => a.name.localeCompare(b.name, "fr-FR"));
}

async function readWorkshopOperations(restaurantId: string, date: string, originalServices:
  Array<{ slot: ServiceSlot; covers: number }> | undefined) {
  const serviceDate = new Date(`${date}T00:00:00.000Z`);
  const prefix = `workshop-kitchen:v1:${date}:`;
  const [sessions, productions, wastes] = await Promise.all([
    originalServices ? [] : prisma.restaurantServiceSession.findMany({ where: {
      restaurantId, serviceDate, actorId: simulationActor, revision: 1, plannedOpen: true,
    }, select: { slot: true, actualCovers: true, note: true } }),
    prisma.production.findMany({ where: {
      restaurantId, date: serviceDate, actorId: simulationActor, operationId: { startsWith: prefix },
      kind: { in: ["production", "refusal"] },
    }, select: { recipeName: true, serviceSlot: true, kind: true, portions: true } }),
    prisma.wasteRecord.findMany({ where: {
      restaurantId, serviceDate, actorId: simulationActor, operationId: { startsWith: `${prefix}loss:` },
    }, select: { kind: true, quantity: true, unit: true, note: true, product: { select: { name: true } },
      production: { select: { recipeName: true } }, stockMovement: { select: { productNameSnapshot: true } },
    }, orderBy: { operationId: "asc" } }),
  ]);
  const services: WorkshopDayDetails["services"] = serviceSlots.flatMap(slot => {
    const original = originalServices?.find(row => row.slot === slot);
    if (original) return [{ slot, covers: original.covers, note: null }];
    const session = sessions.find(row => row.slot === slot);
    return session ? [{ slot, covers: session.actualCovers, note: session.note || null }] : [];
  });
  const preparations = new Map<string, WorkshopDayDetails["preparations"][number]>();
  for (const row of productions) {
    const slot = validSlot(row.serviceSlot) ? row.serviceSlot : null;
    const key = `${slot}:${row.recipeName}`;
    const entry = preparations.get(key) ?? { slot, name: row.recipeName, prepared: 0, refused: 0 };
    if (row.kind === "production") entry.prepared += row.portions;
    else entry.refused += row.portions;
    preparations.set(key, entry);
  }
  return {
    services,
    preparations: [...preparations.values()].sort((a, b) => (a.slot ?? "").localeCompare(b.slot ?? "") || a.name.localeCompare(b.name, "fr-FR")),
    losses: wastes.map(row => {
      const label = lossLabels[row.kind] ?? "Perte";
      return { name: row.stockMovement?.productNameSnapshot ?? row.product?.name ?? row.production?.recipeName ?? label,
        quantity: row.quantity.toNumber(), unit: row.unit, reason: row.note || label };
    }),
  };
}

export async function getWorkshopDayDetails(restaurantId: string, date: string): Promise<WorkshopDayDetails> {
  const dayKind = workshopDayKind(date);
  const stockKind = workshopStockKind(date);
  const balancesKind = workshopStockBalancesKind(date);
  const operationsKind = workshopOperationsKind(date);
  const documents = await prisma.workspaceDocument.findMany({ where: {
    restaurantId, kind: { in: [dayKind, stockKind, balancesKind, operationsKind] },
  }, select: { kind: true, updatedAt: true, data: true } });
  const day = documents.find(row => row.kind === dayKind);
  if (!day) throw new WorkspaceError(404, "WORKSHOP_DAY_NOT_FOUND", "Cette journée n’a pas été importée par l’atelier.");
  const stockDocument = documents.find(row => row.kind === stockKind);
  const balances = documents.find(row => row.kind === balancesKind)?.data;
  const operationsDocument = documents.find(row => row.kind === operationsKind);
  const metadata = workshopOperationsMetadataSchema.safeParse(operationsDocument?.data).data;
  const [sales, stock, operations] = await Promise.all([
    prisma.saleContribution.findMany({ where: {
      restaurantId, source: "demo_simulation", sourceDate: date, sourceKey: { startsWith: `${dayKind}:sale:` },
    }, select: { sourceItemName: true, sourceQuantity: true }, orderBy: { sourceItemName: "asc" } }),
    stockDocument ? readWorkshopStock(restaurantId, stockKind, balances) : [],
    operationsDocument ? readWorkshopOperations(restaurantId, date, metadata?.services) : { services: [], preparations: [], losses: [] },
  ]);
  return {
    date, confirmedAt: day.updatedAt.toISOString(),
    sections: { sales: true, stock: Boolean(stockDocument), operations: Boolean(operationsDocument) },
    incident: metadata?.incident ?? null, events: metadata?.events ?? [], stock, ...operations,
    sales: sales.map(row => ({ name: row.sourceItemName, quantity: Number(row.sourceQuantity) })),
  };
}
