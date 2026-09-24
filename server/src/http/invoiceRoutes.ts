import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../infrastructure/database/prisma.js";
import { createInvoiceDraftFromSource, getInvoices, getSourceInvoiceWorkflowStates,
  invoiceDraftSchema, saveInvoice, sourceInvoiceDocumentSchema } from "../application/workspace/invoiceService.js";
export const invoiceRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
invoiceRoutes.get("/source-invoices", async (_req, res, next) => {
  try {
    const { restaurantId } = context(res);
    const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "source-invoice:" } }, select: { data: true } });
    const invoices = documents.map(({ data }) => sourceInvoiceDocumentSchema.parse(data));
    const workflow = await getSourceInvoiceWorkflowStates(restaurantId, invoices.map((invoice) => invoice.id));
    res.json(invoices.map((invoice) => {
      return { id: invoice.id, title: invoice.title, date: invoice.date, originalDate: invoice.originalDate,
        supplier: invoice.supplier, type: invoice.type, status: invoice.status, stockLineCount: invoice.stockLines.length,
        ...workflow.get(invoice.id) };
    }).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title)));
  } catch (error) { next(error); }
});
invoiceRoutes.get("/source-invoices/:id", async (req, res, next) => {
  try {
    const id = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
    const { restaurantId } = context(res);
    const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: `source-invoice:${id}` } } });
    if (!document) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Pièce introuvable." } }); return; }
    const invoice = sourceInvoiceDocumentSchema.parse(document.data);
    const workflow = await getSourceInvoiceWorkflowStates(restaurantId, [invoice.id]);
    res.json({ id: invoice.id, title: invoice.title, date: invoice.date, originalDate: invoice.originalDate,
      supplier: invoice.supplier, type: invoice.type, status: invoice.status, content: invoice.content,
      stockLines: invoice.stockLines, ...workflow.get(invoice.id) });
  } catch (error) { next(error); }
});
invoiceRoutes.get("/invoices", async (_req, res, next) => {
  try { res.json(await getInvoices(context(res).restaurantId)); } catch (error) { next(error); }
});
invoiceRoutes.post("/invoices/from-source/:id", async (req, res, next) => {
  try {
    const sourceDocumentId = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
    const { restaurantId, actorId } = context(res);
    res.json(await createInvoiceDraftFromSource(restaurantId, actorId, sourceDocumentId));
  } catch (error) { next(error); }
});
invoiceRoutes.post("/invoices/:id", async (req, res, next) => {
  try {
    const id = z.union([z.literal("demo"), z.uuid(), z.string().regex(/^source:[a-f0-9]{24}$/)]).parse(req.params.id);
    const { draft, revision, receive } = z.object({ draft: invoiceDraftSchema, revision: z.number().int().nonnegative(), receive: z.boolean() }).strict().parse(req.body);
    const { restaurantId, actorId } = context(res);
    res.json(await saveInvoice(restaurantId, actorId, id, revision, draft, receive));
  } catch (error) { next(error); }
});
