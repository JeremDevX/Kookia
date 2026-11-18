import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma.js";
import { createSaleContribution, lockSalesWorkspace, recordSaleContributionEvent } from "./salesContributionLedger.js";
import { WorkspaceError } from "./workspaceError.js";

interface WorkshopServiceDay {
  open: boolean;
  sales: Array<{ name: string; normalizedName: string; quantity: number }>;
}

const actorId = "workshop-import:v1";
const source = "demo_simulation";
const reason = "Vente simulée importée depuis l’atelier documentaire.";

export async function importWorkshopDay(restaurantId: string, date: string, day: WorkshopServiceDay) {
  const serviceDate = new Date(`${date}T00:00:00.000Z`);
  const kind = `workshop-day:v1:${date}`;
  const sales = [...day.sales].sort((a, b) => a.normalizedName < b.normalizedName ? -1 : 1);
  const digest = createHash("sha256").update(JSON.stringify({ open: day.open, sales })).digest("hex");
  const result = { date, saleCount: sales.length };

  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const workspace = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
    if (workspace?.mode !== "demo") {
      throw new WorkspaceError(403, "DEMO_WORKSPACE_REQUIRED", "L’import exige un établissement de démonstration configuré.");
    }

    const prior = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } }, select: { data: true } });
    if (prior?.data === digest) return { ...result, replayed: true };
    const existing = await tx.serviceDay.findUnique({
      where: { restaurantId_serviceDate: { restaurantId, serviceDate } }, select: { serviceDate: true },
    });
    if (prior || existing) {
      throw new WorkspaceError(409, "WORKSHOP_DAY_CONFLICT", "Cette journée contient déjà des données différentes dans Kookia.");
    }

    await tx.serviceDay.create({ data: {
      restaurantId, serviceDate, status: day.open ? "open" : "closed", coverage: "complete", source, actorId,
    } });
    if (sales.length > 0) {
      await tx.saleItem.createMany({
        data: sales.map(({ name, normalizedName }) => ({ restaurantId, name, normalizedName })), skipDuplicates: true,
      });
    }
    const items = await tx.saleItem.findMany({
      where: { restaurantId, normalizedName: { in: sales.map(item => item.normalizedName) } },
      select: { id: true, normalizedName: true },
    });
    const itemByName = new Map(items.map(item => [item.normalizedName, item.id]));
    for (const { name, normalizedName, quantity } of sales) {
      const saleItemId = itemByName.get(normalizedName);
      if (!saleItemId) throw new Error("Missing sale item during workshop import");
      const sourceKey = `${kind}:sale:${saleItemId}`;
      const contribution = await createSaleContribution(tx, restaurantId, {
        source, sourceKey, sourceRevision: 1, sourceItemName: name,
        sourceDate: date, serviceDate, sourceQuantity: String(quantity), quantity, saleItemId,
        status: "accepted", reviewRevision: 1, reviewedBy: actorId, reviewedAt: new Date(), reviewReason: reason,
      });
      await recordSaleContributionEvent(tx, {
        restaurantId, contributionId: contribution.id, operationId: sourceKey, revision: 1,
        kind: "accepted", actorId, reason, snapshot: { sourceItemName: name, sourceDate: date, quantity, source },
      });
      await tx.dailySale.create({ data: {
        restaurantId, serviceDate, saleItemId, quantity, source, operationId: sourceKey,
        contributionId: contribution.id, createdBy: actorId, updatedBy: actorId,
      } });
    }
    await tx.workspaceDocument.create({ data: { restaurantId, kind, data: digest } });
    return { ...result, replayed: false };
  });
}
