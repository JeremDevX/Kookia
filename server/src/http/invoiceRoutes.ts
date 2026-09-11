import { Router, type Response } from "express";
import { z } from "zod";
import { getInvoices, invoiceDraftSchema, saveInvoice } from "../application/workspace/invoiceService.js";
export const invoiceRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
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
