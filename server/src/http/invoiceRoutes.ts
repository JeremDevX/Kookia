import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { getInvoices, invoiceDraftSchema, saveInvoice } from "../application/workspace/invoiceService.js";
export const invoiceRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const sourceSchema = z.object({ id: z.string(), title: z.string(), date: z.string().nullable(), originalDate: z.string().nullable(),
  supplier: z.string(), type: z.enum(["invoice", "credit", "delivery"]), status: z.string(), content: z.string(),
  stockLines: z.array(z.object({ name: z.string(), quantity: z.number(), unit: z.string(), unitPrice: z.number() })) });
invoiceRoutes.get("/source-invoices", async (_req, res, next) => {
  try {
    const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId: context(res).restaurantId, kind: { startsWith: "source-invoice:" } }, select: { data: true } });
    res.json(documents.map(({ data }) => {
      const invoice = sourceSchema.parse(data);
      return { id: invoice.id, title: invoice.title, date: invoice.date, originalDate: invoice.originalDate,
        supplier: invoice.supplier, type: invoice.type, status: invoice.status, stockLineCount: invoice.stockLines.length };
    }).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title)));
  } catch (error) { next(error); }
});
invoiceRoutes.get("/source-invoices/:id", async (req, res, next) => {
  try {
    const id = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId: context(res).restaurantId, kind: `source-invoice:${id}` } } });
    if (!document) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Pièce introuvable." } }); return; }
    const invoice = sourceSchema.parse(document.data);
    res.json({ id: invoice.id, title: invoice.title, date: invoice.date, originalDate: invoice.originalDate,
      supplier: invoice.supplier, type: invoice.type, status: invoice.status, content: invoice.content,
      stockLines: invoice.stockLines });
  } catch (error) { next(error); }
});
invoiceRoutes.get("/invoices", async (_req, res, next) => {
  try { res.json(await getInvoices(context(res).restaurantId)); } catch (error) { next(error); }
});
invoiceRoutes.post("/invoices/:id", async (req, res, next) => {
  try {
    const id = z.union([z.literal("demo"), z.uuid()]).parse(req.params.id);
    const { draft, revision, receive } = z.object({ draft: invoiceDraftSchema, revision: z.number().int().nonnegative(), receive: z.boolean() }).strict().parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.json(await saveInvoice(restaurantId, actorId, id, revision, draft, receive));
  } catch (error) { next(error); }
});
