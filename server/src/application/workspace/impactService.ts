import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { isSimulationStockMovement } from "./stockMovementProvenance.js";

type ImpactDatabase = PrismaClient | Prisma.TransactionClient;
type ImpactItem = { productId: string; productName: string; unit: string; quantity: number; knownCost: number;
  unpricedMovementCount: number; movementCount: number; operationIds: string[] };
type ReceiptItem = { productId: string; productName: string; unit: string; receivedQuantity: number; cost: number;
  receiptIds: string[]; orderIds: string[] };
type SaleItem = { saleItemId: string; saleItemName: string; quantity: number; operationIds: string[] };
type ImpactBucket = { menuItemUnits: number; salesByItem: SaleItem[]; serviceDays: { complete: number; partial: number;
  coverageMissing: number; closed: number; unregistered: number }; lossesByProduct: ImpactItem[]; knownLossCost: number;
  unpricedLossMovementCount: number; lossMovementCount: number; receivedCost: number; receiptCount: number;
  receiptsByProduct: ReceiptItem[] };

const DAY_MS = 86_400_000;
export const MAX_MONTHLY_IMPACT_MONTHS = 48;
const dateAt = (date: string) => new Date(`${date}T00:00:00.000Z`);
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const result = dateAt(date);
  result.setUTCDate(result.getUTCDate() + days);
  return dateOnly(result);
};
const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

export const calendarMonthCount = (from: string, to: string) => monthIndex(to) - monthIndex(from) + 1;

function monthRanges(from: string, to: string) {
  const ranges: Array<{ month: string; from: string; to: string }> = [];
  for (let index = monthIndex(from); index <= monthIndex(to); index += 1) {
    const year = Math.floor(index / 12), monthNumber = index % 12 + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const monthStart = `${month}-01`;
    const monthEnd = dateOnly(new Date(Date.UTC(year, monthNumber, 0)));
    ranges.push({ month, from: from > monthStart ? from : monthStart, to: to < monthEnd ? to : monthEnd });
  }
  return ranges;
}

function emptyBucket(calendarDays: number): ImpactBucket {
  return { menuItemUnits: 0, salesByItem: [], serviceDays: { complete: 0, partial: 0, coverageMissing: 0, closed: 0,
    unregistered: calendarDays }, lossesByProduct: [], knownLossCost: 0, unpricedLossMovementCount: 0,
    lossMovementCount: 0, receivedCost: 0, receiptCount: 0, receiptsByProduct: [] };
}

function emptyPeriod(from: string, to: string, calendarDays: number) {
  return { from, to, calendarDays, recorded: emptyBucket(calendarDays), simulation: emptyBucket(calendarDays),
    hasRecordedData: false, hasSimulationData: false,
    excluded: { simulatedSales: 0, simulatedLosses: 0, simulatedReceiptLines: 0,
      lossUnitMismatch: 0, receiptUnitMismatch: 0 } };
}

function monthlyPeriod(month: string, period: ReturnType<typeof emptyPeriod>) {
  const project = (bucket: ImpactBucket) => ({ menuItemUnits: bucket.menuItemUnits, serviceDays: bucket.serviceDays,
    lossMovementCount: bucket.lossMovementCount, knownLossCost: bucket.knownLossCost,
    unpricedLossMovementCount: bucket.unpricedLossMovementCount, receivedCost: bucket.receivedCost,
    receiptCount: bucket.receiptCount });
  return { month, from: period.from, to: period.to, calendarDays: period.calendarDays,
    recorded: project(period.recorded), simulation: project(period.simulation),
    hasRecordedData: period.hasRecordedData, hasSimulationData: period.hasSimulationData,
    excluded: period.excluded };
}

function quantity(decimal: Prisma.Decimal) { return Number(decimal); }

export async function getImpactReport(restaurantId: string, from: string, to: string, db: ImpactDatabase = prisma,
  options: { includeMonthly?: boolean } = {}) {
  const dayCount = Math.floor((dateAt(to).getTime() - dateAt(from).getTime()) / DAY_MS) + 1;
  const previous = { from: addDays(from, -dayCount), to: addDays(from, -1) };
  const rangeStart = dateAt(previous.from);
  const rangeEnd = new Date(dateAt(to).getTime() + DAY_MS);
  const workspace = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  if (!workspace) throw new Error("Workspace not found.");

  const [serviceDays, sales, movements, receiptLines] = await Promise.all([
    db.serviceDay.findMany({ where: { restaurantId, serviceDate: { gte: rangeStart, lt: rangeEnd } },
      select: { serviceDate: true, status: true, coverage: true, source: true } }),
    db.dailySale.findMany({ where: { restaurantId, serviceDate: { gte: rangeStart, lt: rangeEnd } },
      include: { saleItem: { select: { id: true, name: true } }, serviceDay: { select: { source: true } } } }),
    db.stockMovement.findMany({ where: { restaurantId, createdAt: { gte: rangeStart, lt: rangeEnd },
      reason: { in: ["loss", "simulation_loss"] } }, include: { product: { select: { id: true, name: true, unit: true } },
        purchaseReceiptLine: { select: { receipt: { select: { simulated: true } } } } } }),
    db.purchaseReceiptLine.findMany({ where: { restaurantId, receivedQuantity: { gt: 0 }, receipt: { deliveryDate: { gte: rangeStart, lt: rangeEnd } } },
      include: { product: { select: { unit: true } }, receipt: { select: { id: true, orderId: true, deliveryDate: true, simulated: true } } } }),
  ]);

  const summarize = (start: string, end: string) => {
    const calendarDays = Math.floor((dateAt(end).getTime() - dateAt(start).getTime()) / DAY_MS) + 1;
    const period = emptyPeriod(start, end, calendarDays);
    const salesGroups = new Map<string, { name: string; quantity: number; operationIds: string[] }>();
    const lossGroups = new Map<string, { productId: string; name: string; unit: string; quantity: Prisma.Decimal;
      knownCost: Prisma.Decimal; unpricedCount: number; count: number; operationIds: string[] }>();
    const receiptGroups = new Map<string, { productId: string; name: string; unit: string; quantity: Prisma.Decimal;
      cost: Prisma.Decimal; receiptIds: string[]; orderIds: string[] }>();
    const recordedServiceDates = new Set<string>();
    const simulatedReceiptIds = new Set<string>();
    const recordedReceiptIds = new Set<string>();

    for (const row of serviceDays) {
      const serviceDate = dateOnly(row.serviceDate);
      if (!inRange(serviceDate, start, end)) continue;
      const isSimulation = workspace.mode === "demo" || row.source === "demo_simulation";
      if (isSimulation) {
        period.hasSimulationData = true;
        if (row.status === "closed") period.simulation.serviceDays.closed++;
        else if (row.coverage === "complete") period.simulation.serviceDays.complete++;
        else if (row.coverage === "partial") period.simulation.serviceDays.partial++;
        else period.simulation.serviceDays.coverageMissing++;
        continue;
      }
      period.hasRecordedData = true;
      recordedServiceDates.add(serviceDate);
      if (row.status === "closed") period.recorded.serviceDays.closed++;
      else if (row.coverage === "complete") period.recorded.serviceDays.complete++;
      else if (row.coverage === "partial") period.recorded.serviceDays.partial++;
      else period.recorded.serviceDays.coverageMissing++;
    }
    period.recorded.serviceDays.unregistered = Math.max(0, calendarDays - recordedServiceDates.size);
    period.simulation.serviceDays.unregistered = calendarDays - serviceDays.filter((row) => {
      const date = dateOnly(row.serviceDate);
      return workspace.mode === "demo" ? inRange(date, start, end) : row.source === "demo_simulation" && inRange(date, start, end);
    }).length;

    for (const sale of sales) {
      const serviceDate = dateOnly(sale.serviceDate);
      if (!inRange(serviceDate, start, end)) continue;
      const isSimulation = workspace.mode === "demo" || sale.source === "demo_simulation" || sale.serviceDay.source === "demo_simulation";
      const bucket = isSimulation ? period.simulation : period.recorded;
      if (isSimulation) period.hasSimulationData = true;
      else period.hasRecordedData = true;
      if (isSimulation) period.excluded.simulatedSales++;
      bucket.menuItemUnits += sale.quantity;
      const prior = salesGroups.get(`${isSimulation ? "simulation" : "recorded"}:${sale.saleItemId}`);
      if (prior) { prior.quantity += sale.quantity; prior.operationIds.push(sale.operationId); }
      else salesGroups.set(`${isSimulation ? "simulation" : "recorded"}:${sale.saleItemId}`,
        { name: sale.saleItem.name, quantity: sale.quantity, operationIds: [sale.operationId] });
    }

    for (const movement of movements) {
      const recordedDate = dateOnly(movement.createdAt);
      if (!inRange(recordedDate, start, end) || !movement.delta.isNegative()) continue;
      const isSimulation = isSimulationStockMovement(movement, workspace.mode);
      if (isSimulation && movement.reason !== "loss" && movement.reason !== "simulation_loss") continue;
      const bucket = isSimulation ? period.simulation : period.recorded;
      if (isSimulation) period.hasSimulationData = true;
      else period.hasRecordedData = true;
      if (isSimulation) period.excluded.simulatedLosses++;
      const unit = movement.productUnitSnapshot ?? movement.product.unit;
      if (unit !== movement.product.unit) { period.excluded.lossUnitMismatch++; continue; }
      const key = `${isSimulation ? "simulation" : "recorded"}:${movement.productId}:${unit}`;
      const loss = lossGroups.get(key) ?? { productId: movement.productId,
        name: movement.productNameSnapshot ?? movement.product.name, unit, quantity: new Prisma.Decimal(0),
        knownCost: new Prisma.Decimal(0), unpricedCount: 0, count: 0, operationIds: [] };
      const lostQuantity = movement.delta.abs();
      loss.quantity = loss.quantity.plus(lostQuantity);
      loss.count++;
      loss.operationIds.push(movement.operationId);
      if (movement.unitPriceSnapshot === null) loss.unpricedCount++;
      else loss.knownCost = loss.knownCost.plus(lostQuantity.mul(movement.unitPriceSnapshot));
      lossGroups.set(key, loss);
      bucket.lossMovementCount++;
      if (movement.unitPriceSnapshot === null) bucket.unpricedLossMovementCount++;
      else bucket.knownLossCost += Number(lostQuantity.mul(movement.unitPriceSnapshot));
    }

    for (const line of receiptLines) {
      const deliveryDate = dateOnly(line.receipt.deliveryDate);
      if (!inRange(deliveryDate, start, end)) continue;
      const isSimulation = workspace.mode === "demo" || line.receipt.simulated;
      const bucket = isSimulation ? period.simulation : period.recorded;
      if (isSimulation) period.hasSimulationData = true;
      else period.hasRecordedData = true;
      if (isSimulation) { period.excluded.simulatedReceiptLines++; simulatedReceiptIds.add(line.receipt.id); }
      else recordedReceiptIds.add(line.receipt.id);
      if (line.unit !== line.product.unit) { period.excluded.receiptUnitMismatch++; continue; }
      const key = `${isSimulation ? "simulation" : "recorded"}:${line.productId}:${line.unit}`;
      const item = receiptGroups.get(key) ?? { productId: line.productId, name: line.productName, unit: line.unit,
        quantity: new Prisma.Decimal(0), cost: new Prisma.Decimal(0), receiptIds: [], orderIds: [] };
      item.quantity = item.quantity.plus(line.receivedQuantity);
      item.cost = item.cost.plus(line.receivedQuantity.mul(line.invoiceUnitPrice));
      item.receiptIds.push(line.receipt.id);
      item.orderIds.push(line.receipt.orderId);
      receiptGroups.set(key, item);
      bucket.receivedCost += Number(line.receivedQuantity.mul(line.invoiceUnitPrice));
    }

    const presentGroups = <T extends { productId?: string; name?: string }>(groups: Map<string, T>, scope: string) =>
      [...groups.entries()].filter(([key]) => key.startsWith(`${scope}:`)).map(([, item]) => item);
    for (const scope of ["recorded", "simulation"] as const) {
      const bucket = period[scope];
      bucket.salesByItem = [...salesGroups.entries()].filter(([key]) => key.startsWith(`${scope}:`)).map(([key, item]) => ({
        saleItemId: key.slice(scope.length + 1), saleItemName: item.name, quantity: item.quantity,
        operationIds: [...new Set(item.operationIds)].sort(),
      })).sort((a, b) => a.saleItemName.localeCompare(b.saleItemName, "fr"));
      bucket.lossesByProduct = presentGroups(lossGroups, scope).map((item) => {
        const loss = item as { productId: string; name: string; unit: string; quantity: Prisma.Decimal;
          knownCost: Prisma.Decimal; unpricedCount: number; count: number; operationIds: string[] };
        return { productId: loss.productId, productName: loss.name, unit: loss.unit, quantity: quantity(loss.quantity),
          knownCost: quantity(loss.knownCost), unpricedMovementCount: loss.unpricedCount, movementCount: loss.count,
          operationIds: [...new Set(loss.operationIds)].sort() };
      }).sort((a, b) => a.productName.localeCompare(b.productName, "fr"));
      bucket.receiptsByProduct = presentGroups(receiptGroups, scope).map((item) => {
        const receipt = item as { productId: string; name: string; unit: string; quantity: Prisma.Decimal;
          cost: Prisma.Decimal; receiptIds: string[]; orderIds: string[] };
        return { productId: receipt.productId, productName: receipt.name, unit: receipt.unit,
          receivedQuantity: quantity(receipt.quantity), cost: quantity(receipt.cost),
          receiptIds: [...new Set(receipt.receiptIds)].sort(), orderIds: [...new Set(receipt.orderIds)].sort() };
      }).sort((a, b) => a.productName.localeCompare(b.productName, "fr"));
      bucket.receiptCount = scope === "recorded" ? recordedReceiptIds.size : simulatedReceiptIds.size;
    }
    period.recorded.menuItemUnits = sales.filter((sale) => inRange(dateOnly(sale.serviceDate), start, end) &&
      workspace.mode !== "demo" && sale.source !== "demo_simulation" && sale.serviceDay.source !== "demo_simulation")
      .reduce((total, sale) => total + sale.quantity, 0);
    period.simulation.menuItemUnits = sales.filter((sale) => inRange(dateOnly(sale.serviceDate), start, end) &&
      (workspace.mode === "demo" || sale.source === "demo_simulation" || sale.serviceDay.source === "demo_simulation"))
      .reduce((total, sale) => total + sale.quantity, 0);
    return period;
  };

  const current = summarize(from, to);
  const prior = summarize(previous.from, previous.to);
  const report = { from, to, previous, comparison: "same_number_of_calendar_days" as const,
    timezone: "Europe/Paris", currency: "EUR",
    dateBasis: { sales: "serviceDate Europe/Paris", losses: "stock movement recordedAt UTC", receipts: "deliveryDate on confirmed receipt" },
    unavailableMetrics: ["stockouts", "unsold_quantity"], savingsClaim: "not_measured", generatedAt: new Date().toISOString(),
    current, prior };
  if (!options.includeMonthly) return report;
  const monthly = monthRanges(from, to).map(({ month, from: monthFrom, to: monthTo }) =>
    monthlyPeriod(month, summarize(monthFrom, monthTo)));
  return { ...report, monthly };
}
