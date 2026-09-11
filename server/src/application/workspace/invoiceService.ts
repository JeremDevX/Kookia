import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

const lineSchema = z.object({ productId: z.string().min(1).max(100),
  quantity: z.number().finite().positive().max(1000000).multipleOf(0.001),
  unitPrice: z.number().finite().min(0).max(1000000).multipleOf(0.0001) }).strict();
export const invoiceDraftSchema = z.object({ reference: z.string().trim().min(1).max(120),
  date: z.iso.date(), lines: z.array(lineSchema).min(1).max(100).refine((lines) => new Set(lines.map((line) => line.productId)).size === lines.length),
}).strict();
const invoiceSchema = invoiceDraftSchema.extend({ id: z.string(), status: z.enum(["draft", "received"]),
  source: z.enum(["demo", "manual"]), receivedAt: z.iso.datetime().optional(), receivedBy: z.string().optional() });
const initial = { id: "demo", reference: "Rungis-2024-12-09", date: "2024-12-09", status: "draft" as const, source: "demo" as const,
  lines: [{ productId: "p1", quantity: 12, unitPrice: 2.4 }, { productId: "p2", quantity: 5, unitPrice: 8.5 },
    { productId: "p15", quantity: 3, unitPrice: 1.5 }, { productId: "p4", quantity: 10, unitPrice: 12 }] };

export async function getInvoices(restaurantId: string) {
  await prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind: "invoice:demo" } },
    create: { restaurantId, kind: "invoice:demo", data: initial }, update: {} });
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "invoice:" } }, orderBy: { updatedAt: "desc" } });
  return documents.map((document) => ({ ...invoiceSchema.parse(document.data), revision: document.revision }));
}

export async function saveInvoice(restaurantId: string, actorId: string, id: string, revision: number,
  draft: z.infer<typeof invoiceDraftSchema>, receive: boolean) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const kind = `invoice:${id}`;
    const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    const prior = existing ? invoiceSchema.parse(existing.data) : null;
    if (prior?.status === "received") {
      // Repeating a confirmed receipt is safe only for the same reviewed values.
      if (receive && prior.reference === draft.reference && prior.date === draft.date && prior.lines.length === draft.lines.length && prior.lines.every((line, index) => line.productId === draft.lines[index].productId && line.quantity === draft.lines[index].quantity && line.unitPrice === draft.lines[index].unitPrice)) return { ...prior, revision: existing!.revision };
      throw new WorkspaceError(409, "ALREADY_RECEIVED", "Cette facture a déjà été réceptionnée et ne peut plus être modifiée.");
    }
    if ((existing?.revision ?? 0) !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette facture a changé. Rechargez-la avant de poursuivre.");
    for (const line of [...draft.lines].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: line.productId } } });
      if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit est absent de votre catalogue.");
      if (receive) {
        await tx.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } }, data: { currentStock: { increment: line.quantity },
          ...(!product.lastDelivery || product.lastDelivery < new Date(draft.date) ? { lastDelivery: new Date(draft.date) } : {}) } });
        await tx.stockMovement.create({ data: { restaurantId, productId: line.productId, delta: line.quantity,
          reason: "receipt", operationId: `invoice:${id}`, actorId } });
      }
    }
    const invoice = { ...draft, id, source: prior?.source ?? "manual", status: receive ? "received" as const : "draft" as const,
      ...(receive ? { receivedAt: new Date().toISOString(), receivedBy: actorId } : {}) };
    const saved = await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind } },
      create: { restaurantId, kind, data: invoice, revision: 1 }, update: { data: invoice, revision: { increment: 1 } } });
    return { ...invoice, revision: saved.revision };
  });
}
