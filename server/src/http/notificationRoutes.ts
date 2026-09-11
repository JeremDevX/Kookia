import { Router, type Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import initialNotifications from "../infrastructure/database/seed/notifications.json" with { type: "json" };

const notificationsSchema = z.array(z.object({
  id: z.string(), type: z.enum(["warning", "alert", "info"]), title: z.string(), message: z.string(),
  createdAt: z.iso.datetime(), read: z.boolean(), actionable: z.boolean().optional(), productId: z.string().optional(),
  productName: z.string().optional(), suggestedQuantity: z.number().optional(), unit: z.string().optional(),
  currentStock: z.number().optional(), estimatedRunout: z.string().optional(),
}));
const restaurantId = (res: Response) => (res.locals.workspace as { restaurantId: string }).restaurantId;
async function getNotifications(id: string) {
  const document = await prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId: id, kind: "notifications" } },
    create: { restaurantId: id, kind: "notifications", data: initialNotifications }, update: {} });
  return notificationsSchema.parse(document.data);
}
export const notificationRoutes = Router();
notificationRoutes.get("/notifications", async (_req, res, next) => {
  try { res.json(await getNotifications(restaurantId(res))); } catch (error) { next(error); }
});
notificationRoutes.post("/notifications/read", async (req, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string().min(1).max(100)).max(100) }).strict().parse(req.body);
    const id = restaurantId(res);
    await getNotifications(id);
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${id} FOR UPDATE`);
      const document = await tx.workspaceDocument.findUniqueOrThrow({ where: { restaurantId_kind: { restaurantId: id, kind: "notifications" } } });
      const items = notificationsSchema.parse(document.data).map((item) => ids.includes(item.id) ? { ...item, read: true } : item);
      await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId: id, kind: "notifications" } }, data: { data: items, revision: { increment: 1 } } });
      return items;
    });
    res.json(result);
  } catch (error) { next(error); }
});
