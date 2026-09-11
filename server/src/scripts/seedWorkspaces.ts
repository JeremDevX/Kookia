import { prisma } from "../infrastructure/database/prisma.js";
import { ensureWorkspace } from "../application/workspace/ensureWorkspace.js";
import { initialInvoice } from "../application/workspace/invoiceService.js";
import insights from "../infrastructure/database/seed/insights.json" with { type: "json" };
import menu from "../infrastructure/database/seed/menu.json" with { type: "json" };
import notifications from "../infrastructure/database/seed/notifications.json" with { type: "json" };

try {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    const restaurant = await ensureWorkspace(user.id);
    await prisma.$transaction([
      prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId: restaurant.id, kind: "insights" } }, create: { restaurantId: restaurant.id, kind: "insights", data: insights }, update: {} }),
      prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId: restaurant.id, kind: "menu" } }, create: { restaurantId: restaurant.id, kind: "menu", data: menu }, update: {} }),
      prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId: restaurant.id, kind: "notifications" } }, create: { restaurantId: restaurant.id, kind: "notifications", data: notifications }, update: {} }),
      prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId: restaurant.id, kind: "invoice:demo" } }, create: { restaurantId: restaurant.id, kind: "invoice:demo", data: initialInvoice }, update: {} }),
    ]);
  }
  console.info(`${users.length} espace(s) vérifiés. Données existantes conservées.`);
} finally { await prisma.$disconnect(); }
