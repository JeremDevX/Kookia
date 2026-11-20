import { createHash } from "node:crypto";
import { Prisma, type StockLot } from "@prisma/client";
import { addCalendarDays } from "../../../../shared/calendarDate.js";
import { lockReceiptProducts } from "./receiptStock.js";
import { applyStockMovement } from "./stockWrite.js";
import { WorkspaceError } from "./workspaceError.js";
import type { WorkshopStockInput } from "./workshopStockInput.js";

type StockLine = WorkshopStockInput[number];
type SourceLot = StockLine["lots"][number];

const prefix = "workshop-stock:v1:";
const actorId = "workshop-import:v1";
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const quantity = (milli: number) => new Prisma.Decimal(milli).div(1000);
const cost = (cents: number) => new Prisma.Decimal(cents).div(100);
const byKey = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const productKey = (line: { name: string; unit: string }) => `${line.name}\0${line.unit}`;
const stockDigest = (stock: WorkshopStockInput) => createHash("sha256").update(JSON.stringify(stock)).digest("hex");

export function workshopStockLotId(restaurantId: string, productId: string, reference: string) {
  const bytes = createHash("sha256").update(JSON.stringify([prefix, restaurantId, productId, reference])).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes.subarray(0, 16).toString("hex").replace(/^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/, "$1-$2-$3-$4-$5");
}

function stockConflict(name: string) {
  return new WorkspaceError(409, "WORKSHOP_STOCK_CONFLICT", `Le produit « ${name} » ou ses lots diffèrent du stock d’ouverture de l’atelier.`);
}

function matchOpeningLots(line: StockLine, currentStock: Prisma.Decimal, activeLots: StockLot[],
  restaurantId: string, productId: string) {
  const opening = line.lots.filter(lot => lot.openingMilli > 0);
  if (opening.length !== activeLots.length || !currentStock.equals(quantity(opening.reduce((sum, lot) => sum + lot.openingMilli, 0)))) {
    throw stockConflict(line.name);
  }
  const matched = new Map<string, string>();
  const used = new Set<string>();
  for (const source of opening) {
    const expectedId = workshopStockLotId(restaurantId, productId, source.reference);
    const candidates = activeLots.filter(lot => lot.receivedAt?.getTime() === day(source.receivedOn).getTime() &&
      lot.expiresAt?.getTime() === day(source.expiresOn).getTime() && lot.remainingQuantity.equals(quantity(source.openingMilli)));
    const simulated = candidates.find(lot => lot.id === expectedId && lot.source === "demo_simulation" &&
      lot.unitCost?.equals(cost(source.unitCostCents)));
    // Historic receipt lots retain their Kookia invoice cost, which can differ from the workshop catalog cost.
    const legacy = candidates.filter(lot => lot.source === "receipt");
    const match = simulated ?? (legacy.length === 1 ? legacy[0] : undefined);
    if (!match || used.has(match.id)) throw stockConflict(line.name);
    matched.set(source.reference, match.id);
    used.add(match.id);
  }
  return matched;
}

async function applyLot(tx: Prisma.TransactionClient, restaurantId: string, line: StockLine,
  productId: string, source: SourceLot, serviceDate: string, id: string) {
  const operation = `${prefix}${serviceDate}:${source.reference}`;
  const movement = { restaurantId, productId, actorId, productNameSnapshot: line.name, productUnitSnapshot: line.unit };
  if (source.addedMilli > 0) {
    await applyStockMovement(tx, { ...movement, operationId: `${operation}:in`, delta: quantity(source.addedMilli),
      reason: source.addition === "adjustment" ? "simulation_stock_adjustment" : "simulation_restock" },
    { lots: { simulationLot: { id, receivedAt: day(source.receivedOn), expiresAt: day(source.expiresOn), unitCost: cost(source.unitCostCents) } } });
  }
  if (source.lossMilli > 0) {
    await applyStockMovement(tx, { ...movement, operationId: `${operation}:loss`, delta: quantity(-source.lossMilli),
      reason: "simulation_loss" }, { lots: { selectedLotId: id } });
  }
  const adjustmentOut = source.adjustmentOutMilli ?? 0;
  const consumed = source.openingMilli + source.addedMilli - source.lossMilli - source.closingMilli - adjustmentOut;
  if (consumed > 0) {
    await applyStockMovement(tx, { ...movement, operationId: `${operation}:out`, delta: quantity(-consumed),
      reason: "simulated_consumption" }, { lots: { selectedLotId: id, usageDate: day(serviceDate) } });
  }
  if (adjustmentOut > 0) {
    await applyStockMovement(tx, { ...movement, operationId: `${operation}:adjustment`, delta: quantity(-adjustmentOut),
      reason: "simulation_stock_adjustment" }, { lots: { selectedLotId: id } });
  }
}

export async function applyWorkshopStock(tx: Prisma.TransactionClient, restaurantId: string, date: string, stock: WorkshopStockInput) {
  const kind = `${prefix}${date}`;
  const hasCountBreakdown = stock.some(line => line.lots.some(lot => lot.adjustmentOutMilli !== undefined));
  const normalized = stock.map(line => ({
    ...line,
    lots: line.lots.map(lot => hasCountBreakdown ? { ...lot, adjustmentOutMilli: lot.adjustmentOutMilli ?? 0 } : lot)
      .sort((a, b) => byKey(a.reference, b.reference)),
  })).sort((a, b) => byKey(productKey(a), productKey(b)));
  const digest = stockDigest(normalized);
  const prior = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } }, select: { data: true } });
  if (prior?.data === digest) return;
  if (prior) {
    const withoutSuppliers = normalized.map(line => ({ ...line, supplier: undefined }));
    if (prior.data === stockDigest(withoutSuppliers)) return;
    // Old imports folded count removals into consumption. Only their stored digest matches this projection.
    const legacy = withoutSuppliers.map(line => ({
      ...line, lots: line.lots.map(lot => ({ ...lot, adjustmentOutMilli: undefined })),
    }));
    if (prior.data === stockDigest(legacy)) return;
    throw new WorkspaceError(409, "WORKSHOP_STOCK_CHANGED", "Le stock de cette journée a déjà été synchronisé avec d’autres valeurs.");
  }
  const latest = await tx.workspaceDocument.findFirst({ where: { restaurantId, kind: { startsWith: prefix } },
    orderBy: { kind: "desc" }, select: { kind: true } });
  if (latest && addCalendarDays(latest.kind.slice(prefix.length), 1) !== date) {
    throw new WorkspaceError(409, "WORKSHOP_STOCK_SEQUENCE", "Reprenez la synchronisation du stock au lendemain de la dernière clôture.");
  }

  const filters = normalized.map(({ name, unit, supplier }) => ({
    name, unit, ...(supplier && { supplier: { name: supplier } }),
  }));
  const scope = { restaurantId, OR: filters };
  const catalog = await tx.product.findMany({ where: scope, select: { id: true } });
  await lockReceiptProducts(tx, restaurantId, catalog.map(product => product.id));
  const products = await tx.product.findMany({ where: { ...scope, id: { in: catalog.map(product => product.id) } },
    select: { id: true, unit: true, name: true, currentStock: true, supplier: { select: { name: true } },
      stockLots: { where: { remainingQuantity: { gt: 0 } } } } });
  const plan = normalized.map(line => {
    const matches = products.filter(product => productKey(product) === productKey(line)
      && (!line.supplier || product.supplier.name === line.supplier));
    if (matches.length !== 1) throw stockConflict(line.name);
    const product = matches[0];
    const opening = matchOpeningLots(line, product.currentStock, product.stockLots, restaurantId, product.id);
    return { line, product, opening };
  });
  for (const { line, product, opening } of plan) {
    for (const lot of line.lots) {
      const id = opening.get(lot.reference) ?? workshopStockLotId(restaurantId, product.id, lot.reference);
      await applyLot(tx, restaurantId, line, product.id, lot, date, id);
    }
  }
  await tx.workspaceDocument.create({ data: { restaurantId, kind, data: digest } });
}
