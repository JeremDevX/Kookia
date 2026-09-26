import { Router, type Response } from "express";
import { z } from "zod";
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
