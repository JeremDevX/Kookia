import { Router, type Response } from "express";
import { z } from "zod";
import { getWeeklyServices, saveWeeklyService, getServiceCalendar, saveCalendarService,
  getSaleAllocation, saveSaleAllocation } from "../application/workspace/serviceCalendarService.js";

export const serviceCalendarRoutes = Router();
const workspace = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const slot = z.enum(["lunch", "dinner"]);
const revision = z.number().int().min(0);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const period = z.object({ from: z.iso.date(), to: z.iso.date() }).strict()
  .refine(({ from, to }) => from <= to && Date.parse(to) - Date.parse(from) <= 366 * 86400000);
const weekly = z.object({ weekday: z.number().int().min(0).max(6), slot, opensAt: time, closesAt: time,
  open: z.boolean(), expectedRevision: revision }).strict().refine((entry) => !entry.open || entry.opensAt < entry.closesAt);
const session = z.object({ serviceDate: z.iso.date(), slot, plannedOpen: z.boolean(),
  coverage: z.enum(["missing", "partial", "complete"]), actualCovers: z.number().int().min(0).max(100000).nullable(),
  note: z.string().trim().max(1000), expectedRevision: revision }).strict().refine((entry) => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return entry.serviceDate <= today || (entry.coverage === "missing" && entry.actualCovers === null);
  }, { message: "Une planification future ne peut pas contenir d’observations." });
const allocation = z.object({ lunchQuantity: z.number().int().min(0).max(1000000),
  dinnerQuantity: z.number().int().min(0).max(1000000), expectedRevision: revision, expectedSaleRevision: revision }).strict();

serviceCalendarRoutes.get("/services/weekly", async (_req, res, next) => {
  try { res.json(await getWeeklyServices(workspace(res).restaurantId)); } catch (error) { next(error); }
});
serviceCalendarRoutes.put("/services/weekly", async (req, res, next) => {
  try { const { restaurantId, actorId } = workspace(res); res.json(await saveWeeklyService(restaurantId, actorId, weekly.parse(req.body))); }
  catch (error) { next(error); }
});
serviceCalendarRoutes.get("/services/calendar", async (req, res, next) => {
  try { const { from, to } = period.parse(req.query); res.json(await getServiceCalendar(workspace(res).restaurantId, from, to)); }
  catch (error) { next(error); }
});
serviceCalendarRoutes.put("/services/calendar", async (req, res, next) => {
  try { const { restaurantId, actorId } = workspace(res); res.json(await saveCalendarService(restaurantId, actorId, session.parse(req.body))); }
  catch (error) { next(error); }
});
serviceCalendarRoutes.get("/sales/:id/services", async (req, res, next) => {
  try { res.json(await getSaleAllocation(workspace(res).restaurantId, z.uuid().parse(req.params.id))); }
  catch (error) { next(error); }
});
serviceCalendarRoutes.put("/sales/:id/services", async (req, res, next) => {
  try { const { restaurantId, actorId } = workspace(res);
    res.json(await saveSaleAllocation(restaurantId, actorId, z.uuid().parse(req.params.id), allocation.parse(req.body))); }
  catch (error) { next(error); }
});
