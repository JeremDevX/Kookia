import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";

export const reportRoutes = Router();
interface Row { section: string; date: string; metric: string; value: string | number; source: string; }
function flatten(value: unknown, path: string, date: string, rows: Row[]) {
  if (typeof value === "number" || typeof value === "string") rows.push({ section: "Instantané analytics", date, metric: path, value, source: "Démonstration — période d’origine non précisée" });
  else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) flatten(child, path ? `${path}.${key}` : key, date, rows);
}
reportRoutes.get("/report", async (req, res, next) => {
  try {
    const { from, to } = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine((range) => range.from <= range.to).parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
    const [analytics, predictions, movements, productions, orders] = await prisma.$transaction([
      prisma.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: { restaurantId, kind: "analytics" } } }),
      prisma.prediction.findMany({ where: { restaurantId, predictedDate: { gte: start, lt: end } }, orderBy: { predictedDate: "asc" } }),
      prisma.stockMovement.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } }),
      prisma.production.findMany({ where: { restaurantId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
      prisma.purchaseOrder.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, include: { lines: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const rows: Row[] = [];
    // Legacy chart data lacks observation dates; export it as one dated migration snapshot,
    // never pretend its monthly/weekly aggregates describe the requested interval.
    const snapshotDate = "2026-09-11";
    if (from <= snapshotDate && to >= snapshotDate) flatten(analytics.data, "", snapshotDate, rows);
    for (const item of predictions) {
      rows.push({ section: "Prévisions", date: item.predictedDate.toISOString().slice(0, 10), metric: `${item.productId} — consommation prévue`, value: Number(item.predictedConsumption), source: item.source });
      rows.push({ section: "Prévisions", date: item.predictedDate.toISOString().slice(0, 10), metric: `${item.productId} — confiance`, value: item.confidence, source: item.source });
    }
    for (const item of movements) rows.push({ section: "Mouvements de stock", date: item.createdAt.toISOString(), metric: `${item.productId} — ${item.reason}`, value: Number(item.delta), source: "Opération enregistrée — unité du produit" });
    for (const item of productions) rows.push({ section: "Productions et refus", date: item.date.toISOString().slice(0, 10), metric: `${item.recipeName} — ${item.kind}`, value: item.portions, source: "Déclaration enregistrée — portions" });
    for (const order of orders) for (const line of order.lines) rows.push({ section: "Commandes validées", date: order.createdAt.toISOString(), metric: `${line.productName} — ${line.quantity} ${line.unit}`, value: Number(line.quantity.mul(line.pricePerUnit)), source: "Commande à transmettre — EUR" });
    res.json({ from, to, timezone: "UTC", generatedAt: new Date().toISOString(), rows });
  } catch (error) { next(error); }
});
