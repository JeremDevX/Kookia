import { Router, type Response } from "express";
import { z } from "zod";
import { getInventorySession, openInventorySession, saveInventorySession, validateInventorySession, refreshInventorySession, discardInventorySession } from "../application/workspace/inventorySessionService.js";
import { listStockLots } from "../application/workspace/lotService.js";
import { listWaste, recordWaste } from "../application/workspace/wasteService.js";
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
export const inventoryRoutes = Router();
export const wasteSchema = z.object({ operationId: z.uuid(), serviceDate: z.iso.date(),
  serviceSlot: z.enum(["lunch", "dinner"]).nullable().optional(),
  kind: z.enum(["raw", "preparation", "unsold", "plate_return"]), avoidability: z.enum(["avoidable", "inedible"]),
  productId: z.string().min(1).max(100).optional(), lotId: z.uuid().optional(), productionId: z.uuid().optional(),
  quantity: z.number().finite().positive().max(1_000_000).multipleOf(0.001), unit: z.enum(["kg", "L", "dz", "pcs", "portion"]),
  note: z.string().trim().max(1000),
}).strict().refine((input) => input.serviceDate <= new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
inventoryRoutes.get("/stock-lots", async (_req, res, next) => {
  try { res.json(await listStockLots(context(res).restaurantId)); } catch (error) { next(error); }
});
inventoryRoutes.get("/products/:id/lots", async (req, res, next) => {
  try { res.json(await listStockLots(context(res).restaurantId, String(req.params.id))); } catch (error) { next(error); }
});
inventoryRoutes.get("/waste", async (_req, res, next) => {
  try { res.json(await listWaste(context(res).restaurantId)); } catch (error) { next(error); }
});
inventoryRoutes.post("/waste", async (req, res, next) => {
  try { const { restaurantId, actorId } = context(res); res.status(201).json(await recordWaste(restaurantId, actorId, wasteSchema.parse(req.body))); }
  catch (error) { next(error); }
});

const sessionLine = z.object({ productId: z.string().min(1).max(100),
  countedQuantity: z.number().finite().min(0).max(1_000_000).multipleOf(0.001).nullable(), reason: z.string().trim().max(1000) }).strict();
const sessionSave = z.object({ revision: z.number().int().positive(), lines: z.array(sessionLine).max(10000) }).strict();
const sessionRevision = z.object({ revision: z.number().int().positive() }).strict();
inventoryRoutes.get("/inventory-session/context", (_req, res) => {
  res.json({ restaurantId: context(res).restaurantId });
});
inventoryRoutes.use("/inventory-session", (req, res, next) => {
  const expected = req.get("X-Expected-Restaurant-Id");
  if (expected && expected !== context(res).restaurantId) {
    res.status(409).json({ error: { code: "WORKSPACE_CHANGED", message: "Votre établissement a changé. Rechargez la page avant de continuer." } }); return;
  }
  next();
});
inventoryRoutes.get("/inventory-session", async (_req, res, next) => {
  try { res.json(await getInventorySession(context(res).restaurantId)); } catch (error) { next(error); }
});
inventoryRoutes.post("/inventory-session", async (_req, res, next) => {
  try { const { restaurantId, actorId } = context(res); res.json(await openInventorySession(restaurantId, actorId)); } catch (error) { next(error); }
});
inventoryRoutes.put("/inventory-session/:id", async (req, res, next) => {
  try { const input = sessionSave.parse(req.body); res.json(await saveInventorySession(context(res).restaurantId, String(req.params.id), input.revision, input.lines)); } catch (error) { next(error); }
});
inventoryRoutes.post("/inventory-session/:id/validate", async (req, res, next) => {
  try { const { restaurantId, actorId } = context(res); const input = sessionRevision.parse(req.body);
    res.json(await validateInventorySession(restaurantId, actorId, String(req.params.id), input.revision)); } catch (error) { next(error); }
});
inventoryRoutes.post("/inventory-session/:id/refresh", async (req, res, next) => {
  try { const input = sessionRevision.parse(req.body); res.json(await refreshInventorySession(context(res).restaurantId, String(req.params.id), input.revision)); } catch (error) { next(error); }
});
inventoryRoutes.post("/inventory-session/:id/discard", async (req, res, next) => {
  try { const input = sessionRevision.parse(req.body); await discardInventorySession(context(res).restaurantId, context(res).actorId, String(req.params.id), input.revision); res.status(204).end(); } catch (error) { next(error); }
});
