import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { inspectTicketFile, type TicketFileMetadata } from "../../integrations/ticketFile.js";
import { WorkspaceError } from "./catalogService.js";
import { lockSalesWorkspace } from "./salesContributionLedger.js";

const candidateSchema = z.object({
  sourceDateText: z.string().trim().max(80),
  serviceDate: z.iso.date(),
  lines: z.array(z.object({ itemLabel: z.string().trim().min(1).max(120), quantity: z.number().int().positive().max(1_000_000) }).strict()).max(200),
}).strict();
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const hashValue = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalizedName = (value: string) => value.trim().toLocaleLowerCase("fr-FR");
function comparableTicketDate(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!iso && !french) return null;
  const normalized = iso ? trimmed : `${french![3]}-${french![2].padStart(2, "0")}-${french![1].padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${normalized}T00:00:00.000Z`)) || new Date(`${normalized}T00:00:00.000Z`).toISOString().slice(0, 10) !== normalized
    ? null : normalized;
}

export type TicketZBatchSummary = {
  id: string; contentHash: string; mimeType: string; byteSize: number; sourceDateText: string | null;
  serviceDate: string | null; status: "uploaded" | "candidates" | "no_details" | "reviewed";
  provenance: "recorded_sales" | "demo_simulation"; recordCount: number; duplicate: boolean;
};

function batchSummary(batch: {
  id: string; contentHash: string; mimeType: string; byteSize: number; sourceDateText: string | null;
  serviceDate: Date | null; status: TicketZBatchSummary["status"]; provenance: TicketZBatchSummary["provenance"];
  recordCount: number;
}, duplicate: boolean): TicketZBatchSummary {
  return { ...batch, serviceDate: batch.serviceDate?.toISOString().slice(0, 10) ?? null, duplicate };
}

export function inspectTicketZUpload(contentType: string | undefined, body: unknown) {
  const result = inspectTicketFile(contentType, body);
  if (!result.valid) throw new WorkspaceError(result.status, result.code, result.message);
  return result.metadata;
}

export async function registerTicketZUpload(restaurantId: string, actorId: string, metadata: TicketFileMetadata) {
  const createBatch = async () => prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const existing = await tx.ticketZBatch.findUnique({ where: { restaurantId_contentHash: {
      restaurantId, contentHash: metadata.contentHash,
    } } });
    if (existing) return batchSummary(existing, true);
    const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } });
    if (!restaurant) throw new WorkspaceError(404, "NOT_FOUND", "Restaurant introuvable.");
    const batch = await tx.ticketZBatch.create({ data: { id: randomUUID(), restaurantId,
      contentHash: metadata.contentHash, mimeType: metadata.mimeType, byteSize: metadata.byteSize,
      provenance: restaurant.mode === "demo" ? "demo_simulation" : "recorded_sales", createdBy: actorId } });
    return batchSummary(batch, false);
  }, { maxWait: 20_000, timeout: 30_000 });

  try { return await createBatch(); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.ticketZBatch.findUnique({ where: { restaurantId_contentHash: {
        restaurantId, contentHash: metadata.contentHash,
      } } });
      if (existing) return batchSummary(existing, true);
    }
    throw error;
  }
}

export async function createTicketZCandidates(restaurantId: string, actorId: string, id: string, input: unknown) {
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceError(400, "INVALID_TICKET_CANDIDATE", "Vérifiez la date et les lignes du Ticket Z.");
  if (parsed.data.serviceDate > parisToday()) throw new WorkspaceError(400, "FUTURE_SERVICE_DATE", "La date de service ne peut pas être future.");
  const candidateHash = hashValue(parsed.data);
  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const batch = await tx.ticketZBatch.findFirst({ where: { restaurantId, id } });
    if (!batch) throw new WorkspaceError(404, "NOT_FOUND", "Ticket Z introuvable dans cet espace.");
    if (batch.status !== "uploaded") {
      if (batch.candidateHash === candidateHash) return { ...batchSummary(batch, true), replayed: true };
      throw new WorkspaceError(409, "TICKET_ALREADY_REVIEWED", "Ce Ticket Z possède déjà des lignes candidates ou une revue terminée.");
    }

    const items = parsed.data.lines.length ? await tx.saleItem.findMany({ where: { restaurantId }, select: { id: true, normalizedName: true } }) : [];
    const itemIdsByName = new Map(items.map((item) => [item.normalizedName, item.id]));
    const contributions: Prisma.SaleContributionCreateManyInput[] = parsed.data.lines.map((line, index) => ({
      id: randomUUID(), restaurantId, source: "ticket_z", sourceKey: `ticket-z:${batch.contentHash}:${index + 1}`,
      sourceRevision: 1, ticketBatchId: batch.id, ticketLineNumber: index + 1,
      sourceItemName: line.itemLabel, sourceDate: parsed.data.sourceDateText || parsed.data.serviceDate,
      serviceDate: dateValue(parsed.data.serviceDate), sourceQuantity: String(line.quantity), quantity: line.quantity,
      saleItemId: itemIdsByName.get(normalizedName(line.itemLabel)) ?? null, status: "pending", reviewRevision: 0,
    }));
    const now = new Date();
    const comparableSourceDate = comparableTicketDate(parsed.data.sourceDateText);
    const events: Prisma.SaleContributionEventCreateManyInput[] = contributions.map((row, index) => ({
      id: randomUUID(), restaurantId, contributionId: row.id!, operationId: `ticket-z:receive:${batch.contentHash}:${index + 1}`,
      revision: 0, kind: "source_received", actorId,
      reason: "Ligne transcrite depuis le Ticket Z ; une revue humaine est nécessaire avant de compter la vente.",
      snapshot: { contentHash: batch.contentHash, lineNumber: index + 1, itemLabel: parsed.data.lines[index].itemLabel,
        quantity: parsed.data.lines[index].quantity, sourceDateText: parsed.data.sourceDateText || null,
        serviceDate: parsed.data.serviceDate, dateMatchesSource: comparableSourceDate === null ? null : comparableSourceDate === parsed.data.serviceDate,
        originalFileStored: false } as Prisma.InputJsonObject, createdAt: now,
    }));
    if (contributions.length) {
      await tx.saleContribution.createMany({ data: contributions });
      await tx.saleContributionEvent.createMany({ data: events });
    }
    const saved = await tx.ticketZBatch.update({ where: { id: batch.id }, data: {
      sourceDateText: parsed.data.sourceDateText || null, serviceDate: dateValue(parsed.data.serviceDate),
      status: contributions.length ? "candidates" : "no_details", candidateHash, recordCount: contributions.length,
    } });
    return { ...batchSummary(saved, false), replayed: false };
  }, { maxWait: 20_000, timeout: 30_000 });
}

export async function listTicketZBatches(restaurantId: string) {
  const batches = await prisma.ticketZBatch.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 30 });
  return batches.map((batch) => ({ ...batchSummary(batch, false), createdAt: batch.createdAt.toISOString() }));
}

export async function deleteUnusedTicketZBatch(restaurantId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    await lockSalesWorkspace(tx, restaurantId);
    const batch = await tx.ticketZBatch.findFirst({ where: { restaurantId, id } });
    if (!batch) throw new WorkspaceError(404, "NOT_FOUND", "Ticket Z introuvable dans cet espace.");
    if (batch.status !== "uploaded" && batch.status !== "no_details")
      throw new WorkspaceError(409, "TICKET_HAS_SALES", "Les lignes candidates doivent rester tracées ; écartez-les dans la revue plutôt que supprimer leur historique.");
    await tx.ticketZBatch.delete({ where: { id: batch.id } });
    return { deleted: true };
  });
}
