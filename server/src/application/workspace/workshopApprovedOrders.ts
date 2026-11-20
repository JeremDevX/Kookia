import { Prisma } from "@prisma/client";
import { z } from "zod";
import { addCalendarDays } from "../../../../shared/calendarDate.js";
import { formatParisDate } from "../../../../shared/parisDate.js";
import type { WorkshopApprovedLine } from "../../../../shared/workshopOrders.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./workspaceError.js";

const approval = z.object({ orderId: z.uuid(), suggestions: z.array(z.object({ id: z.uuid() })) });
const suggestion = z.object({ productId: z.string(), suggestion: z.object({ deliveryHorizon: z.object({
  status: z.literal("known"), nextDeliveryDate: z.iso.date(),
}) }) });
const unit = z.enum(["kg", "L", "pcs"]);

export async function findWorkshopApprovedLines(db: Prisma.TransactionClient, restaurantId: string, date: string,
  target?: Pick<WorkshopApprovedLine, "orderId" | "lineId">) {
  const lines = await db.purchaseOrderLine.findMany({ where: {
    restaurantId, ...(target && { id: target.lineId, orderId: target.orderId }),
    suggestionDecision: { restaurantId, decision: "purchase_suggestion_added" },
    order: { restaurant: { mode: "demo" }, status: { in: ["simulated", "simulated_partially_received"] },
      createdAt: { lt: new Date(`${date}T00:00:00Z`) } },
  }, include: {
    order: { select: { actorId: true, createdAt: true, operationId: true } },
    suggestionDecision: { select: { id: true, snapshot: true } },
    receiptLines: { select: { receivedQuantity: true, receipt: { select: { deliveryDate: true, simulated: true } } } },
  }, orderBy: [{ orderId: "asc" }, { id: "asc" }] });
  if (!lines.length) return [];

  const decisions = await db.recommendationDecision.findMany({ where: { restaurantId,
    decision: "order_simulated_validated", operationId: { in: [...new Set(lines.map(line => line.order.operationId))] },
  }, select: { actorId: true, operationId: true, snapshot: true } });
  const decisionsByOperation = new Map(decisions.map(decision => [decision.operationId, decision]));

  return lines.flatMap(line => {
    const decision = decisionsByOperation.get(line.order.operationId);
    const approved = approval.safeParse(decision?.snapshot);
    const orderedOn = formatParisDate(line.order.createdAt);
    const orderUnit = unit.safeParse(line.unit);
    if (orderedOn >= date || decision?.actorId !== line.order.actorId || !orderUnit.success || !approved.success ||
        approved.data.orderId !== line.orderId || !approved.data.suggestions.some(({ id }) => id === line.suggestionDecision?.id)) return [];

    const source = suggestion.safeParse(line.suggestionDecision?.snapshot);
    const explicitDate = line.expectedDeliveryDate?.toISOString().slice(0, 10);
    const expectedOn = line.deliveryRevision > 0 ? explicitDate : explicitDate ??
      (source.success && source.data.productId === line.productId ? source.data.suggestion.deliveryHorizon.nextDeliveryDate : undefined);
    if (!expectedOn || expectedOn < orderedOn) return [];
    const lastReceipt = line.receiptLines.filter(({ receipt }) => receipt.simulated)
      .reduce((latest, { receipt }) => {
        const deliveredOn = receipt.deliveryDate.toISOString().slice(0, 10);
        return deliveredOn > latest ? deliveredOn : latest;
      }, "");
    const nextReceipt = addCalendarDays(lastReceipt || orderedOn, 1);
    const dueOn = nextReceipt > expectedOn ? nextReceipt : expectedOn;
    const remaining = line.receiptLines.reduce((quantity, receipt) => quantity.minus(receipt.receivedQuantity), line.quantity);
    const quantityMilli = remaining.mul(1000).toNumber();
    const unitPriceCents = line.pricePerUnit.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
    if (dueOn > date || quantityMilli <= 0 || (orderUnit.data === "pcs" && quantityMilli % 1000 !== 0) ||
        unitPriceCents <= 0 || unitPriceCents > 10_000_000) return [];
    return [{ orderId: line.orderId, lineId: line.id, orderedOn, dueOn, name: line.productName,
      unit: orderUnit.data, supplier: line.supplierName, quantityMilli, unitPriceCents, line }];
  });
}

export async function getWorkshopApprovedOrders(restaurantId: string, date: string): Promise<WorkshopApprovedLine[]> {
  const workspace = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
  if (!workspace) throw new WorkspaceError(404, "WORKSPACE_NOT_FOUND", "Espace introuvable.");
  if (workspace.mode !== "demo") throw new WorkspaceError(403, "DEMO_WORKSPACE_REQUIRED", "L’import exige un établissement de test autorisé.");
  const lines = await findWorkshopApprovedLines(prisma, restaurantId, date);
  lines.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  return lines.slice(0, 16).map(({ orderId, lineId, orderedOn, dueOn, name, unit, supplier, quantityMilli, unitPriceCents }) =>
    ({ orderId, lineId, orderedOn, dueOn, name, unit, supplier, quantityMilli, unitPriceCents }));
}
