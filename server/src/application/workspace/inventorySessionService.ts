import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { recordStockCountInTransaction } from "./stockCountService.js";

interface Line {
  productId: string; operationId: string; name: string; category: string; unit: string;
  stockRevision: number; theoreticalQuantity: number; countedQuantity: number | null; reason: string; available?: boolean;
  previousCount?: { quantity: number; unit: string; reason: string };
}
interface Session { id: string; actorId: string; status: string; revision: number; lines: Line[]; }
export interface LineInput { productId: string; countedQuantity: number | null; reason: string; }
const getDraft = async (tx: Prisma.TransactionClient, restaurantId: string, lock = false) => {
  const rows = await tx.$queryRaw<Session[]>(lock
    ? Prisma.sql`SELECT id, "actorId", status, revision, lines FROM "InventorySession" WHERE "restaurantId" = ${restaurantId} AND status = 'draft' FOR UPDATE`
    : Prisma.sql`SELECT id, "actorId", status, revision, lines FROM "InventorySession" WHERE "restaurantId" = ${restaurantId} AND status = 'draft'`);
  return rows[0] ?? null;
};
const lockRestaurant = (tx: Prisma.TransactionClient, restaurantId: string) =>
  tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR NO KEY UPDATE`);

export async function getInventorySession(restaurantId: string) { return getDraft(prisma, restaurantId); }
export async function openInventorySession(restaurantId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await lockRestaurant(tx, restaurantId);
    const existing = await getDraft(tx, restaurantId);
    if (existing) return existing;
    const products = await tx.product.findMany({ where: { restaurantId }, orderBy: { name: "asc" } });
    const lines: Line[] = products.map((p) => ({ productId: p.id, operationId: randomUUID(), name: p.name,
      category: p.category, unit: p.unit, stockRevision: p.stockRevision, theoreticalQuantity: Number(p.currentStock),
      countedQuantity: null, reason: "" }));
    const id = randomUUID();
    await tx.$executeRaw(Prisma.sql`INSERT INTO "InventorySession" (id, "restaurantId", "actorId", lines)
      VALUES (${id}, ${restaurantId}, ${actorId}, ${JSON.stringify(lines)}::jsonb)`);
    return { id, actorId, status: "draft", revision: 1, lines };
  });
}
export async function saveInventorySession(restaurantId: string, id: string, revision: number, inputs: LineInput[]) {
  return prisma.$transaction(async (tx) => {
    const session = await getDraft(tx, restaurantId, true);
    if (!session || session.id !== id) throw new WorkspaceError(404, "NOT_FOUND", "Brouillon introuvable.");
    const updates = new Map(inputs.map((input) => [input.productId, input]));
    if (updates.size !== inputs.length || updates.size !== session.lines.length || session.lines.some((line) => !updates.has(line.productId)))
      throw new WorkspaceError(400, "INVALID_LINES", "La liste des produits ne correspond pas à cet inventaire.");
    if (session.revision !== revision) {
      if (session.revision === revision + 1 && session.lines.every((line) => {
        const input = updates.get(line.productId)!;
        return input.countedQuantity === line.countedQuantity && input.reason === line.reason;
      })) return session;
      throw new WorkspaceError(409, "INVENTORY_CHANGED", "Cet inventaire a été modifié ailleurs. Rechargez le brouillon.");
    }
    const lines = session.lines.map((line) => ({ ...line, ...updates.get(line.productId) }));
    await tx.$executeRaw(Prisma.sql`UPDATE "InventorySession" SET lines = ${JSON.stringify(lines)}::jsonb, revision = revision + 1 WHERE id = ${id} AND "restaurantId" = ${restaurantId}`);
    return { ...session, lines, revision: revision + 1 };
  });
}
export async function validateInventorySession(restaurantId: string, actorId: string, id: string, revision: number) {
  return prisma.$transaction(async (tx) => {
    await lockRestaurant(tx, restaurantId);
    const sessions = await tx.$queryRaw<Session[]>(Prisma.sql`SELECT id, "actorId", status, revision, lines FROM "InventorySession" WHERE id = ${id} AND "restaurantId" = ${restaurantId} FOR UPDATE`);
    const session = sessions[0];
    if (!session) throw new WorkspaceError(404, "NOT_FOUND", "Inventaire introuvable.");
    if (session.revision !== revision) throw new WorkspaceError(409, "INVENTORY_CHANGED", "Cet inventaire a été modifié ailleurs. Rechargez le brouillon.");
    if (session.status === "validated") return session;
    const counted = session.lines.filter((line) => line.countedQuantity !== null).sort((a, b) => a.productId.localeCompare(b.productId));
    if (!counted.length) throw new WorkspaceError(400, "EMPTY_INVENTORY", "Comptez au moins un produit.");
    if (counted.some((line) => line.countedQuantity !== line.theoreticalQuantity && !line.reason.trim()))
      throw new WorkspaceError(400, "MISSING_REASON", "Justifiez chaque écart avant validation.");
    for (const line of counted) {
      await recordStockCountInTransaction(tx, restaurantId, actorId, line.productId, {
        operationId: line.operationId, expectedStockRevision: line.stockRevision, expectedUnit: line.unit, countedQuantity: line.countedQuantity!,
      });
      if (line.reason) await tx.$executeRaw(Prisma.sql`UPDATE "StockCount" SET "inventoryReason" = ${line.reason} WHERE "restaurantId" = ${restaurantId} AND id = ${line.operationId}`);
    }
    await tx.$executeRaw(Prisma.sql`UPDATE "InventorySession" SET status = 'validated', "validatedAt" = CURRENT_TIMESTAMP WHERE id = ${id} AND "restaurantId" = ${restaurantId}`);
    return { ...session, status: "validated" };
  }, { timeout: 30000 });
}

export async function refreshInventorySession(restaurantId: string, id: string, revision: number) {
  return prisma.$transaction(async (tx) => {
    await lockRestaurant(tx, restaurantId);
    const session = await getDraft(tx, restaurantId, true);
    if (!session || session.id !== id) throw new WorkspaceError(404, "NOT_FOUND", "Brouillon introuvable.");
    if (session.revision !== revision) throw new WorkspaceError(409, "INVENTORY_CHANGED", "Cet inventaire a été modifié ailleurs. Rechargez le brouillon.");
    const products = await tx.product.findMany({ where: { restaurantId, id: { in: session.lines.map((line) => line.productId) } } });
    const byId = new Map(products.map((product) => [product.id, product]));
    const lines = session.lines.map((line) => {
      const product = byId.get(line.productId);
      if (product && product.stockRevision === line.stockRevision && product.unit === line.unit) return { ...line, available: true };
      const previousCount = line.countedQuantity === null ? line.previousCount : { quantity: line.countedQuantity, unit: line.unit, reason: line.reason };
      return { ...line, ...(product ? { unit: product.unit, stockRevision: product.stockRevision, theoreticalQuantity: Number(product.currentStock) } : {}),
        countedQuantity: null, reason: "", available: !!product, previousCount };
    });
    await tx.$executeRaw(Prisma.sql`UPDATE "InventorySession" SET lines = ${JSON.stringify(lines)}::jsonb, revision = revision + 1 WHERE id = ${id} AND "restaurantId" = ${restaurantId}`);
    return { ...session, lines, revision: revision + 1 };
  });
}

export async function discardInventorySession(restaurantId: string, actorId: string, id: string, revision: number) {
  return prisma.$transaction(async (tx) => {
    const session = await getDraft(tx, restaurantId, true);
    if (!session || session.id !== id) throw new WorkspaceError(404, "NOT_FOUND", "Brouillon introuvable.");
    if (session.actorId !== actorId) {
      const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
      const membership = await tx.membership.findUnique({ where: { userId: actorId }, select: { restaurantId: true, role: true } });
      if (restaurant?.ownerId !== actorId && !(membership?.restaurantId === restaurantId && membership.role === "chef"))
        throw new WorkspaceError(403, "FORBIDDEN", "Seul l’auteur, un chef ou le propriétaire peut supprimer ce brouillon.");
    }
    if (session.revision !== revision) throw new WorkspaceError(409, "INVENTORY_CHANGED", "Cet inventaire a été modifié ailleurs. Rechargez le brouillon.");
    await tx.$executeRaw(Prisma.sql`DELETE FROM "InventorySession" WHERE id = ${id} AND "restaurantId" = ${restaurantId} AND status = 'draft'`);
  });
}
