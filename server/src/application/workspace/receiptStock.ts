import { Prisma, type WorkspaceMode } from "@prisma/client";
import type { LotMovementOptions } from "./lotService.js";
import { applyStockMovement, type StockMovementInput } from "./stockWrite.js";
import { WorkspaceError } from "./workspaceError.js";

export async function lockReceiptWorkspace(tx: Prisma.TransactionClient, restaurantId: string) {
  const [workspace] = await tx.$queryRaw<Array<{ mode: WorkspaceMode }>>(
    Prisma.sql`SELECT mode::text AS mode FROM "Restaurant" WHERE id = ${restaurantId} FOR NO KEY UPDATE`,
  );
  if (!workspace) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
  return workspace.mode;
}

export async function lockReceiptProducts(tx: Prisma.TransactionClient, restaurantId: string, productIds: string[]) {
  if (productIds.length === 0) return;
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE "restaurantId" = ${restaurantId}
    AND id IN (${Prisma.join([...new Set(productIds)])}) ORDER BY id FOR UPDATE`);
}

export function getReceiptProduct(tx: Prisma.TransactionClient, restaurantId: string, productId: string) {
  return tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: productId } },
    select: { id: true, name: true, unit: true, currentStock: true, lastDelivery: true,
      supplierId: true, supplier: { select: { name: true } } } });
}

type ReceiptMovement = Pick<StockMovementInput,
  "delta" | "reason" | "operationId" | "actorId" | "invoiceDocumentId" | "invoiceRevision" |
  "sourceDocumentId" | "sourceContentHash" | "sourceDocumentRevision" | "unitPriceSnapshot" | "purchaseReceiptLineId">;

export async function creditReceiptStock(tx: Prisma.TransactionClient, restaurantId: string,
  product: NonNullable<Awaited<ReturnType<typeof getReceiptProduct>>>, deliveryDate: Date, input: ReceiptMovement,
  receipt?: LotMovementOptions["receipt"]) {
  return applyStockMovement(tx, { ...input, restaurantId, productId: product.id,
    productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: product.supplier.name,
  }, { stockBefore: product.currentStock, lots: { receipt },
    lastDelivery: !product.lastDelivery || product.lastDelivery < deliveryDate ? deliveryDate : undefined });
}
