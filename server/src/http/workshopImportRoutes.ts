import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type ErrorRequestHandler, type RequestHandler } from "express";
import { z } from "zod";
import { formatParisDate } from "../../../shared/parisDate.js";
import { workshopForecastSchema } from "../../../shared/workshopForecast.js";
import { WorkspaceError } from "../application/workspace/workspaceError.js";
import { getWorkshopApprovedOrders } from "../application/workspace/workshopApprovedOrders.js";
import { workshopApprovedPurchaseReference } from "../../../shared/workshopOrders.js";
import { importWorkshopDay } from "../application/workspace/workshopImportService.js";
import { storeWorkshopForecast } from "../application/workspace/workshopForecastService.js";
import { workshopStockSchema } from "../application/workspace/workshopStockInput.js";
import { workshopOperationsSchema } from "../application/workspace/workshopOperationsInput.js";
import type { WorkshopOperationsInput } from "../application/workspace/workshopOperationsInput.js";
import type { WorkshopStockInput } from "../application/workspace/workshopStockInput.js";

const sale = z.strictObject({
  name: z.string().trim().min(1).max(120).refine(value => !/\p{Cc}/u.test(value)),
  quantity: z.number().int().min(1).max(1_000_000),
}).transform(({ name, quantity }) => ({ name, quantity, normalizedName: name.toLocaleLowerCase("fr-FR") }));

const serviceDay = z.strictObject({ open: z.boolean(), sales: z.array(sale).max(25), stock: workshopStockSchema.optional(),
  operations: workshopOperationsSchema.optional() })
  .refine(day => day.open || day.sales.length === 0)
  .refine(day => new Set(day.sales.map(item => item.normalizedName)).size === day.sales.length);
const serviceDate = z.iso.date().refine(date => date >= "0001-01-01");
const tokenDigest = (token: string) => createHash("sha256").update(token).digest();

function operationsMatchDate(operations: WorkshopOperationsInput, date: string, today: string, open: boolean,
  sales: Array<{ normalizedName: string; quantity: number }>, stock?: WorkshopStockInput) {
  if ((operations.services.length > 0) !== open || operations.purchases.some(purchase => purchase.receipt
    ? purchase.orderedOn > date || purchase.receipt.invoiceOn < date || purchase.receipt.invoiceOn > today
    : purchase.orderedOn !== date)) return false;
  const sold = new Map<string, number>();
  for (const { items } of operations.services) for (const item of items) if (item.sold > 0) {
    const key = item.name.toLocaleLowerCase("fr-FR");
    sold.set(key, (sold.get(key) ?? 0) + item.sold);
  }
  if (sold.size !== sales.length || sales.some(item => sold.get(item.normalizedName) !== item.quantity)) return false;
  if (!stock) return true;
  const suppliersByProduct = new Map(stock.map(({ name, unit, supplier }) => [`${name}:${unit}`, supplier]));
  if (operations.losses.some(({ product, unit, supplier }) => {
    const stockSupplier = suppliersByProduct.get(`${product}:${unit}`);
    return supplier && stockSupplier && supplier !== stockSupplier;
  })) return false;
  for (const purchase of operations.purchases.filter(row => row.approvedOrderId)) {
    const [line] = purchase.lines;
    if (!purchase.receipt || !line.approvedLineId || purchase.reference !== workshopApprovedPurchaseReference(date, line.approvedLineId)) return false;
    const reference = `LOT-${purchase.reference}`;
    const product = stock.find(row => row.name === line.name && row.unit === line.unit && row.supplier === purchase.supplier);
    const lot = product?.lots.find(row => row.reference === reference);
    if (line.receivedMilli > 0
      ? !lot || lot.addition !== "delivery" || lot.addedMilli !== line.receivedMilli || lot.unitCostCents !== line.unitPriceCents
      : stock.some(row => row.lots.some(entry => entry.reference === reference))) return false;
  }
  const delivered = new Map<string, number>();
  for (const purchase of operations.purchases) for (const line of purchase.lines) if (line.receivedMilli > 0) {
    const key = `${line.name}:${line.unit}`;
    const stockSupplier = suppliersByProduct.get(key);
    if (stockSupplier && stockSupplier !== purchase.supplier) return false;
    delivered.set(key, (delivered.get(key) ?? 0) + line.receivedMilli);
  }
  for (const line of stock) {
    const key = `${line.name}:${line.unit}`;
    const stockReceived = line.lots.reduce((sum, lot) => lot.addition === "delivery" ? sum + lot.addedMilli : sum, 0);
    if ((delivered.get(key) ?? 0) !== stockReceived) return false;
    delivered.delete(key);
  }
  return delivered.size === 0;
}

export function createWorkshopImportRoutes(token: string, restaurantId: string, allowOperationalTestWorkspace: boolean,
  forecastEnabled: boolean, followOrdersFrom?: string) {
  const routes = Router();
  const expected = tokenDigest(token);

  const authenticate: RequestHandler = (req, res, next) => {
    const supplied = /^Bearer (\S+)$/i.exec(req.get("authorization") ?? "")?.[1] ?? "";
    if (!timingSafeEqual(tokenDigest(supplied), expected)) {
      res.set("WWW-Authenticate", 'Bearer realm="kookia-workshop"').status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Accès à l’import de l’atelier refusé." },
      });
      return;
    }
    next();
  };

  if (followOrdersFrom) routes.get("/approved-orders/:date", authenticate, async (req, res) => {
    const date = serviceDate.safeParse(req.params.date);
    if (!date.success || date.data < followOrdersFrom || date.data >= formatParisDate()) {
      throw new WorkspaceError(400, "WORKSHOP_APPROVED_ORDER_DATE", "Les commandes sont disponibles pour une journée passée du scénario connecté.");
    }
    res.set("Cache-Control", "no-store").json(await getWorkshopApprovedOrders(restaurantId, date.data));
  });

  routes.put("/days/:date", authenticate, async (req, res) => {
    const date = serviceDate.safeParse(req.params.date);
    const day = serviceDay.safeParse(req.body);
    if (!date.success || !day.success) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données de la journée sont invalides." } });
      return;
    }
    const today = formatParisDate();
    if (date.data > today) {
      res.status(400).json({ error: { code: "FUTURE_SERVICE_DATE", message: "La date de service ne peut pas être future." } });
      return;
    }
    const connected = Boolean(followOrdersFrom && date.data >= followOrdersFrom);
    if (connected && date.data >= today)
      throw new WorkspaceError(400, "WORKSHOP_APPROVED_ORDER_DATE", "La synchronisation des commandes concerne une journée clôturée.");
    const purchases = day.data.operations?.purchases ?? [];
    if (connected ? !day.data.stock || !day.data.operations ||
      purchases.some(purchase => !purchase.approvedOrderId && (purchase.orderedOn >= followOrdersFrom! || !purchase.receipt))
      : purchases.some(purchase => purchase.approvedOrderId)) {
      throw new WorkspaceError(400, "WORKSHOP_ORDER_MODE", "Le scénario connecté exige les stocks, les opérations et des réceptions de commandes existantes.");
    }
    if (day.data.stock?.some(({ lots }) => lots.some(({ openingMilli, closingMilli, lossMilli, receivedOn, expiresOn }) =>
      (openingMilli > 0 ? receivedOn >= date.data : receivedOn !== date.data)
      || (expiresOn < date.data && (closingMilli !== 0 || lossMilli !== openingMilli))))) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "L’état des lots ne correspond pas à cette date de service." } });
      return;
    }
    if (day.data.operations && !operationsMatchDate(day.data.operations, date.data, today, day.data.open, day.data.sales, day.data.stock)) {
      res.status(400).json({ error: { code: "WORKSHOP_OPERATIONS_INVALID", message: "Les opérations ne correspondent pas à la journée, aux ventes ou aux entrées de stock." } });
      return;
    }
    res.json(await importWorkshopDay(restaurantId, date.data, day.data, allowOperationalTestWorkspace && !connected, connected));
  });

  if (forecastEnabled) routes.put("/forecast/:date", authenticate, async (req, res) => {
    const forecast = workshopForecastSchema.safeParse(req.body);
    if (!forecast.success || forecast.data.date !== req.params.date) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Les données de la prévision sont invalides." } });
      return;
    }
    const connected = Boolean(followOrdersFrom && forecast.data.date >= followOrdersFrom);
    if (connected !== Boolean(forecast.data.purchaseNeeds)) {
      throw new WorkspaceError(400, "WORKSHOP_ORDER_MODE", "La prévision et le mode d’achat configuré doivent correspondre.");
    }
    res.json(await storeWorkshopForecast(restaurantId, forecast.data, allowOperationalTestWorkspace && !connected));
  });

  const respondToWorkspaceError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (!(error instanceof WorkspaceError)) { next(error); return; }
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
  };
  routes.use(respondToWorkspaceError);
  return routes;
}
