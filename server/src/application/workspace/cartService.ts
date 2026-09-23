import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export const cartItemSchema = z.object({
  id: z.string().min(1).max(100), productId: z.string().min(1).max(100),
  productName: z.string().max(120), quantity: z.number().finite().positive().max(1000000).multipleOf(0.001),
  unit: z.string().max(10), source: z.enum(["notification", "dashboard", "stocks", "prediction"]),
  predictionId: z.string().min(1).max(100).optional(),
}).strict();
export const cartSchema = z.array(cartItemSchema).max(100);
export const cartMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), items: cartSchema.min(1) }).strict(),
  z.object({ action: z.literal("remove"), ids: z.array(z.string().min(1).max(100)).min(1).max(100) }).strict(),
]);

export async function getCart(restaurantId: string) {
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: "cart" } } });
  return cartSchema.parse(document?.data ?? []);
}

export async function mutateCart(restaurantId: string, mutation: z.infer<typeof cartMutationSchema>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const document = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: "cart" } } });
    let items = cartSchema.parse(document?.data ?? []);
    if (mutation.action === "remove") items = items.filter((item) => !mutation.ids.includes(item.id));
    else for (const item of mutation.items) {
      if (item.predictionId) throw new WorkspaceError(400, "DEMO_PREDICTION", "Les scénarios d'exemple ne peuvent pas préparer une commande.");
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: item.productId } } });
      if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Produit introuvable dans votre espace.");
      if (!items.some((existing) => existing.id === item.id)) items.push({ ...item, productName: product.name, unit: product.unit });
    }
    if (items.length > 100) throw new WorkspaceError(400, "CART_FULL", "Le panier est limité à 100 articles.");
    await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind: "cart" } },
      create: { restaurantId, kind: "cart", data: items }, update: { data: items, revision: { increment: 1 } } });
    return items;
  });
}
