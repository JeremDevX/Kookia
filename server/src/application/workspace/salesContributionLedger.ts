import { Prisma, type SaleContributionEventKind } from "@prisma/client";

export type ContributionSnapshot = {
  source: "manual" | "csv" | "pos" | "ticket_z" | "demo_simulation";
  sourceKey: string;
  sourceRevision: number;
  importId?: string;
  importLine?: number;
  sourceItemName: string;
  sourceDate: string;
  serviceDate: Date | null;
  sourceQuantity: string;
  quantity: number | null;
  saleItemId: string | null;
  status: "pending" | "accepted" | "rejected" | "superseded" | "voided";
  reviewRevision: number;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  reviewReason?: string | null;
  supersedesId?: string | null;
  createdAt?: Date;
};

export async function createSaleContribution(tx: Prisma.TransactionClient, restaurantId: string,
  snapshot: ContributionSnapshot) {
  return tx.saleContribution.create({ data: { restaurantId, ...snapshot } });
}

export async function recordSaleContributionEvent(tx: Prisma.TransactionClient, input: {
  restaurantId: string; contributionId: string; operationId: string; revision: number;
  kind: SaleContributionEventKind; actorId: string; reason: string; snapshot: Prisma.InputJsonValue;
}) {
  return tx.saleContributionEvent.create({ data: input });
}

export async function lockSalesWorkspace(tx: Prisma.TransactionClient, restaurantId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
}
