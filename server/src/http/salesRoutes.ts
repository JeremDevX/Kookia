import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { createSale, correctSale, listSales, listSaleItems, createSaleItem, latestService, listServiceDays, saveServiceDay } from "../application/workspace/salesService.js";
import { commitSalesImport, previewSalesImport } from "../application/workspace/salesImportService.js";
import { calculateSalesMetrics } from "../application/workspace/salesMetrics.js";
import { evaluateSalesBaseline } from "../application/workspace/salesBaseline.js";
import { WorkspaceError } from "../application/workspace/catalogService.js";
import { prisma } from "../infrastructure/database/prisma.js";

export const salesRoutes = Router();
const workspace = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const saleValues = z.object({
  saleItemId: z.uuid(), serviceDate: z.iso.date(),
  quantity: z.number().int().min(1).max(1_000_000),
}).strict().refine((sale) => sale.serviceDate <= today(), { message: "La date de service ne peut pas être future." });
const period = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine(
  ({ from, to }) => from <= to && Date.parse(to) - Date.parse(from) <= 366 * 86_400_000,
  { message: "La période doit être croissante et limitée à 366 jours." },
);
const parsePeriod = (req: Request) => {
  const end = today();
  const start = new Date(Date.parse(end) - 29 * 86_400_000).toISOString().slice(0, 10);
  return period.parse({ from: req.query.from ?? start, to: req.query.to ?? end });
};

salesRoutes.get("/sales", async (req, res, next) => {
  try {
    const query = parsePeriod(req);
    res.json(await listSales(workspace(res).restaurantId, query.from, query.to));
  } catch (error) { next(error); }
});
salesRoutes.get("/sales/latest", async (_req, res, next) => {
  try { res.json(await latestService(workspace(res).restaurantId)); } catch (error) { next(error); }
});
salesRoutes.get("/sales/service-days", async (req, res, next) => {
  try {
    const { from, to } = parsePeriod(req);
    res.json(await listServiceDays(workspace(res).restaurantId, from, to));
  } catch (error) { next(error); }
});
const serviceDayValues = z.object({ expectedRevision: z.number().int().min(0),
  status: z.enum(["open", "closed"]), coverage: z.enum(["complete", "partial", "missing"]) }).strict()
  .refine((day) => day.status !== "closed" || day.coverage === "complete", { message: "Un jour fermé doit être confirmé comme complet." });
salesRoutes.put("/sales/service-days/:date", async (req, res, next) => {
  try {
    const serviceDate = z.iso.date().parse(req.params.date);
    if (serviceDate > today()) throw new WorkspaceError(400, "FUTURE_SERVICE_DATE", "La date de service ne peut pas être future.");
    const input = serviceDayValues.parse(req.body);
    const { restaurantId, actorId } = workspace(res);
    res.json(await saveServiceDay(restaurantId, actorId, serviceDate, input.expectedRevision, input.status, input.coverage));
  } catch (error) { next(error); }
});
salesRoutes.get("/sales/metrics", async (req, res, next) => {
  try {
    const { from, to } = parsePeriod(req);
    const duration = Date.parse(to) - Date.parse(from) + 86_400_000;
    const previousTo = new Date(Date.parse(from) - 86_400_000).toISOString().slice(0, 10);
    const previousFrom = new Date(Date.parse(from) - duration).toISOString().slice(0, 10);
    const { restaurantId } = workspace(res);
    const start = new Date(`${previousFrom}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
    const [rows, serviceDays] = await Promise.all([
      prisma.dailySale.findMany({ where: { restaurantId, source: { in: ["manual", "csv", "demo_simulation"] },
        serviceDate: { gte: start, lte: end } }, include: { saleItem: { select: { name: true } } } }),
      prisma.serviceDay.findMany({ where: { restaurantId, serviceDate: { gte: start, lte: end } },
        select: { serviceDate: true, status: true, coverage: true } }),
    ]);
    const mapped = rows.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
      saleItemId: row.saleItemId, saleItemName: row.saleItem.name, quantity: row.quantity,
      source: row.source === "demo_simulation" ? "demo_simulation" as const : row.source === "csv" ? "csv" as const : "manual" as const,
      revision: row.revision }));
    const mappedDays = serviceDays.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
      status: row.status, coverage: row.coverage }));
    res.json(calculateSalesMetrics(mapped.filter((row) => row.serviceDate >= from),
      mapped.filter((row) => row.serviceDate < from), mappedDays.filter((row) => row.serviceDate >= from),
      mappedDays.filter((row) => row.serviceDate < from), from, to, previousFrom, previousTo));
  } catch (error) { next(error); }
});
salesRoutes.get("/sales/baseline", async (_req, res, next) => {
  try {
    const asOfDate = new Date(Date.parse(today()) - 86_400_000).toISOString().slice(0, 10);
    const historyFrom = new Date(Date.parse(asOfDate) - 27 * 86_400_000).toISOString().slice(0, 10);
    const { restaurantId } = workspace(res);
    const start = new Date(`${historyFrom}T00:00:00Z`), end = new Date(`${asOfDate}T00:00:00Z`);
    const [rows, serviceDays] = await Promise.all([
      prisma.dailySale.findMany({ where: { restaurantId, source: { in: ["manual", "csv", "demo_simulation"] },
        serviceDate: { gte: start, lte: end } }, include: { saleItem: { select: { name: true } } } }),
      prisma.serviceDay.findMany({ where: { restaurantId, serviceDate: { gte: start, lte: end } },
        select: { serviceDate: true, status: true, coverage: true } }),
    ]);
    res.json(evaluateSalesBaseline(rows.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
      saleItemId: row.saleItemId, saleItemName: row.saleItem.name, quantity: row.quantity,
      source: row.source === "demo_simulation" ? "demo_simulation" as const : row.source === "csv" ? "csv" as const : "manual" as const })),
    serviceDays.map((row) => ({ serviceDate: row.serviceDate.toISOString().slice(0, 10),
      status: row.status, coverage: row.coverage })), asOfDate));
  } catch (error) { next(error); }
});
salesRoutes.get("/sales/items", async (_req, res, next) => {
  try { res.json(await listSaleItems(workspace(res).restaurantId)); } catch (error) { next(error); }
});
salesRoutes.post("/sales/items", async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().trim().min(1).max(120) }).strict().parse(req.body);
    res.status(201).json(await createSaleItem(workspace(res).restaurantId, name));
  } catch (error) { next(error); }
});
const importBody = z.object({ csv: z.string().min(1).max(256_000), mapping: z.record(z.string(), z.uuid()) }).strict();
salesRoutes.post("/sales/imports/preview", async (req, res, next) => {
  try {
    const { csv, mapping } = importBody.parse(req.body);
    res.json(await previewSalesImport(workspace(res).restaurantId, csv, mapping, today()));
  } catch (error) { next(error); }
});
salesRoutes.post("/sales/imports", async (req, res, next) => {
  try {
    const { csv, mapping, expectedHash } = importBody.safeExtend({ expectedHash: z.string().regex(/^[0-9a-f]{64}$/) }).parse(req.body);
    const { restaurantId, actorId } = workspace(res);
    res.status(201).json(await commitSalesImport(restaurantId, actorId, csv, mapping, expectedHash, today()));
  } catch (error) { next(error); }
});
salesRoutes.post("/sales", async (req, res, next) => {
  try {
    const { operationId, ...input } = saleValues.safeExtend({ operationId: z.uuid() }).parse(req.body);
    const { restaurantId, actorId } = workspace(res);
    res.status(201).json(await createSale(restaurantId, actorId, operationId, input));
  } catch (error) { next(error); }
});
salesRoutes.patch("/sales/:id", async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    const { revision, ...input } = saleValues.safeExtend({ revision: z.number().int().min(0) }).parse(req.body);
    const { restaurantId, actorId } = workspace(res);
    res.json(await correctSale(restaurantId, actorId, id, revision, input));
  } catch (error) { next(error); }
});
