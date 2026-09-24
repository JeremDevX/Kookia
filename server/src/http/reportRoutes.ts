import { Router } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";

export const reportRoutes = Router();
interface Row { section: string; date: string; metric: string; value: string | number; source: string; }
reportRoutes.get("/report", async (req, res, next) => {
  try {
    const { from, to } = z.object({ from: z.iso.date(), to: z.iso.date() }).strict().refine((range) => range.from <= range.to).parse(req.query);
    const restaurantId = (res.locals.workspace as { restaurantId: string }).restaurantId;
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1);
    const [workspace, sales, movements, productions, orders] = await prisma.$transaction([
      prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
      prisma.dailySale.findMany({ where: { restaurantId, serviceDate: { gte: start, lt: end } }, include: {
        saleItem: { select: { name: true } }, serviceDay: { select: { source: true } },
      }, orderBy: { serviceDate: "asc" } }),
      prisma.stockMovement.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, include: {
        product: { select: { name: true, unit: true } }, purchaseReceiptLine: { select: { receipt: { select: { simulated: true } } } },
      }, orderBy: { createdAt: "asc" } }),
      prisma.production.findMany({ where: { restaurantId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
      prisma.purchaseOrder.findMany({ where: { restaurantId, createdAt: { gte: start, lt: end } }, include: { lines: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const rows: Row[] = [];
    if (workspace?.mode !== "demo") {
      for (const item of sales) if (item.source !== "demo_simulation" && item.serviceDay.source !== "demo_simulation")
        rows.push({ section: "Ventes enregistrées", date: item.serviceDate.toISOString().slice(0, 10), metric: `${item.saleItem.name} — unités vendues`, value: item.quantity, source: item.source === "csv" ? item.revision ? "Import CSV corrigé" : "Import CSV" : item.source === "pos" ? item.revision ? "Caisse POS corrigée" : "Caisse POS" : item.source === "ticket_z" ? "Ticket Z vérifié" : "Saisie manuelle" });
      for (const item of movements) if (item.actorId !== "restaurant-simulation:v1" && !item.reason.startsWith("simulation_") &&
        item.reason !== "invoice_import_demo" && !item.operationId.startsWith("restaurant-simulation-v1:") && !item.purchaseReceiptLine?.receipt.simulated)
        rows.push({ section: "Mouvements de stock", date: item.createdAt.toISOString(), metric: `${item.productNameSnapshot ?? item.product.name} — ${item.reason} (${item.productUnitSnapshot ?? item.product.unit})`, value: Number(item.delta), source: item.invoiceDocumentId ? "Pièce validée" : "Opération enregistrée" });
      for (const item of productions) if (item.actorId !== "restaurant-simulation:v1")
        rows.push({ section: "Productions et refus", date: item.date.toISOString().slice(0, 10), metric: `${item.recipeName} — ${item.kind}`, value: item.portions, source: "Déclaration enregistrée — portions" });
      for (const order of orders) if (!order.status.startsWith("simulated")) for (const line of order.lines)
        rows.push({ section: "Commandes validées", date: order.createdAt.toISOString(), metric: `${line.productName} — ${line.quantity} ${line.unit}`, value: Number(line.quantity.mul(line.pricePerUnit)), source: "Commande validée à transmettre — valeur indicative EUR" });
    }
    res.json({ from, to, timezone: "UTC", generatedAt: new Date().toISOString(), rows });
  } catch (error) { next(error); }
});
