import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

const unitSchema = z.string().trim().min(1).max(10);
const dispositionSchema = z.enum(["pending", "stock", "excluded"]);
const exclusionReasonSchema = z.enum(["not_stock_item", "not_readable", "not_applicable", "other"]);
const sourceLineSchema = z.object({
  name: z.string().min(1).max(120), quantity: z.number().finite().positive().max(1_000_000),
  unit: z.enum(["kg", "L", "pcs"]), unitPrice: z.number().finite().min(0).max(1_000_000),
  sourceQuantityText: z.string().max(200), sourceLineNumber: z.number().int().positive(),
  priceBasis: z.enum(["stated_unit_price", "derived_from_line_amount_ht", "derived_from_line_amount_ttc"]),
  priceTaxBasis: z.enum(["HT", "TTC", "unknown"]), code: z.string().max(120).optional(),
});
export const sourceInvoiceDocumentSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).max(500), date: z.iso.date().nullable(), originalDate: z.iso.date().nullable(),
  supplier: z.string().min(1).max(200), type: z.enum(["invoice", "credit", "delivery"]), status: z.string().max(200),
  content: z.string(), stockLines: z.array(sourceLineSchema).max(100),
});

const invoiceLineSchema = z.object({
  productId: z.string().max(100), quantity: z.number().finite().min(0).max(1_000_000).multipleOf(0.001),
  unitPrice: z.number().finite().min(0).max(1_000_000).multipleOf(0.0001), unit: z.union([unitSchema, z.literal("")]).optional(),
  sourceLineNumber: z.number().int().positive().optional(), disposition: dispositionSchema.optional(),
  exclusionReason: exclusionReasonSchema.optional(), sourceName: z.string().max(120).optional(),
  sourceQuantityText: z.string().max(200).optional(), sourceQuantity: z.number().finite().positive().optional(),
  sourceUnit: z.enum(["kg", "L", "pcs"]).optional(), sourceUnitPrice: z.number().finite().min(0).optional(),
  sourcePriceBasis: sourceLineSchema.shape.priceBasis.optional(), sourceTaxBasis: sourceLineSchema.shape.priceTaxBasis.optional(),
  sourceCode: z.string().max(120).optional(),
}).strict();

export const invoiceDraftSchema = z.object({
  reference: z.string().trim().min(1).max(120), date: z.union([z.iso.date(), z.literal("")]),
  lines: z.array(invoiceLineSchema).max(100), sourceTypeConfirmed: z.boolean().optional(), sourceDateConfirmed: z.boolean().optional(),
}).strict().refine((draft) => {
  const sourceLineNumbers = draft.lines.flatMap((line) => line.sourceLineNumber === undefined ? [] : [line.sourceLineNumber]);
  return new Set(sourceLineNumbers).size === sourceLineNumbers.length;
});

const invoiceSchema = invoiceDraftSchema.extend({
  id: z.string(), status: z.enum(["draft", "received"]), source: z.enum(["demo", "manual", "source_document"]),
  receivedAt: z.iso.datetime().optional(), receivedBy: z.string().optional(),
  sourceDocumentId: z.string().regex(/^[a-f0-9]{24}$/).optional(), sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sourceDocumentRevision: z.number().int().nonnegative().optional(), sourceTitle: z.string().max(500).optional(),
  sourceSupplier: z.string().max(200).optional(), sourceType: z.enum(["invoice", "credit", "delivery"]).optional(),
  sourceStatus: z.string().max(200).optional(), sourceDemoDate: z.iso.date().nullable().optional(),
  sourceOriginalDate: z.iso.date().nullable().optional(), sourceLineCount: z.number().int().nonnegative().optional(),
  provenance: z.literal("demo_simulation").optional(), alreadyCreditedBySimulation: z.boolean().optional(),
});

export const initialInvoice = { id: "demo", reference: "Rungis-2024-12-09", date: "2024-12-09", status: "draft" as const, source: "demo" as const,
  lines: [{ productId: "p1", quantity: 12, unitPrice: 2.4 }, { productId: "p2", quantity: 5, unitPrice: 8.5 },
    { productId: "p15", quantity: 3, unitPrice: 1.5 }, { productId: "p4", quantity: 10, unitPrice: 12 }] };

const sourceInvoiceKind = (sourceDocumentId: string) => `invoice:source:${sourceDocumentId}`;
const sourceInvoiceId = (sourceDocumentId: string) => `source:${sourceDocumentId}`;
const sourceIdFromInvoiceId = (invoiceId: string) => invoiceId.match(/^source:([a-f0-9]{24})$/)?.[1];
const simulationVersion = "restaurant-simulation-v1";
const simulationActor = "restaurant-simulation:v1";

export interface SourceInvoiceWorkflowState {
  invoiceId?: string; invoiceStatus?: "draft" | "received"; receivedAt?: string;
  alreadyCreditedBySimulation: boolean; sourceMovementCount: number;
}

export async function getSourceInvoiceWorkflowStates(restaurantId: string, sourceDocumentIds: string[]) {
  if (sourceDocumentIds.length === 0) return new Map<string, SourceInvoiceWorkflowState>();
  const kinds = sourceDocumentIds.map(sourceInvoiceKind);
  const [draftDocuments, movements] = await prisma.$transaction([
    prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { in: kinds } }, select: { data: true } }),
    prisma.stockMovement.findMany({ where: { restaurantId, reason: "invoice_import_demo" },
      select: { operationId: true, actorId: true, invoiceDocumentId: true } }),
  ]);
  const draftBySource = new Map<string, z.infer<typeof invoiceSchema>>();
  for (const { data } of draftDocuments) {
    const invoice = invoiceSchema.parse(data);
    if (invoice.sourceDocumentId) draftBySource.set(invoice.sourceDocumentId, invoice);
  }
  return new Map(sourceDocumentIds.map((sourceId) => {
    const prefix = `${simulationVersion}:invoice:${sourceId}:`;
    const related = movements.filter((movement) => movement.operationId.startsWith(prefix));
    const draft = draftBySource.get(sourceId);
    return [sourceId, {
      ...(draft ? { invoiceId: draft.id, invoiceStatus: draft.status,
        ...(draft.receivedAt ? { receivedAt: draft.receivedAt } : {}) } : {}),
      alreadyCreditedBySimulation: related.some((movement) => movement.actorId === simulationActor && !movement.invoiceDocumentId),
      sourceMovementCount: related.length,
    } satisfies SourceInvoiceWorkflowState];
  }));
}

async function getSourceDocument(tx: Prisma.TransactionClient, restaurantId: string, sourceDocumentId: string) {
  const document = await tx.workspaceDocument.findUnique({
    where: { restaurantId_kind: { restaurantId, kind: `source-invoice:${sourceDocumentId}` } },
  });
  if (!document) throw new WorkspaceError(404, "NOT_FOUND", "Pièce introuvable dans cet espace.");
  return { document, source: sourceInvoiceDocumentSchema.parse(document.data) };
}

async function hasSimulationCredit(tx: Prisma.TransactionClient, restaurantId: string, sourceDocumentId: string) {
  const prefix = `${simulationVersion}:invoice:${sourceDocumentId}:`;
  return !!await tx.stockMovement.findFirst({ where: {
    restaurantId, actorId: simulationActor, reason: "invoice_import_demo", invoiceDocumentId: null,
    operationId: { startsWith: prefix },
  }, select: { id: true } });
}

function candidateLine(sourceLine: z.infer<typeof sourceLineSchema>) {
  return {
    productId: "", quantity: 0, unitPrice: 0, unit: "", sourceLineNumber: sourceLine.sourceLineNumber,
    disposition: "pending" as const, sourceName: sourceLine.name, sourceQuantityText: sourceLine.sourceQuantityText,
    sourceQuantity: sourceLine.quantity, sourceUnit: sourceLine.unit, sourceUnitPrice: sourceLine.unitPrice,
    sourcePriceBasis: sourceLine.priceBasis, sourceTaxBasis: sourceLine.priceTaxBasis,
    ...(sourceLine.code ? { sourceCode: sourceLine.code } : {}),
  };
}

function invoiceSnapshot(invoice: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonValue;
}

export async function createInvoiceDraftFromSource(restaurantId: string, actorId: string, sourceDocumentId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const { document, source } = await getSourceDocument(tx, restaurantId, sourceDocumentId);
    const kind = sourceInvoiceKind(sourceDocumentId);
    const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    if (existing) {
      const invoice = invoiceSchema.parse(existing.data);
      if (invoice.sourceContentHash !== source.contentHash || invoice.sourceDocumentRevision !== document.revision) {
        throw new WorkspaceError(409, "SOURCE_CHANGED", "La pièce source a changé depuis la création du brouillon. Reprenez-la pour vérifier les différences.");
      }
      return { ...invoice, revision: existing.revision, alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, sourceDocumentId) };
    }

    const invoice = {
      id: sourceInvoiceId(sourceDocumentId), reference: source.title.slice(0, 120), date: source.date ?? "",
      lines: source.stockLines.map(candidateLine), status: "draft" as const, source: "source_document" as const,
      sourceDocumentId, sourceContentHash: source.contentHash, sourceDocumentRevision: document.revision,
      sourceTitle: source.title, sourceSupplier: source.supplier, sourceType: source.type,
      sourceStatus: source.status, sourceDemoDate: source.date, sourceOriginalDate: source.originalDate,
      sourceLineCount: source.stockLines.length, provenance: "demo_simulation" as const,
      sourceTypeConfirmed: false, sourceDateConfirmed: false,
    };
    const saved = await tx.workspaceDocument.create({ data: { restaurantId, kind, data: invoice, revision: 1 } });
    await tx.invoiceDraftRevision.create({ data: {
      restaurantId, invoiceDocumentId: invoice.id, sourceDocumentId, sourceContentHash: source.contentHash,
      sourceDocumentRevision: document.revision, revision: saved.revision, actorId, data: invoiceSnapshot(invoice),
    } });
    return { ...invoice, revision: saved.revision, alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, sourceDocumentId) };
  });
}

export async function getInvoices(restaurantId: string) {
  await prisma.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind: "invoice:demo" } },
    create: { restaurantId, kind: "invoice:demo", data: initialInvoice }, update: {} });
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "invoice:" } }, orderBy: { updatedAt: "desc" } });
  const invoices = documents.map((document) => ({ ...invoiceSchema.parse(document.data), revision: document.revision }));
  const sourceIds = invoices.flatMap((invoice) => invoice.sourceDocumentId ? [invoice.sourceDocumentId] : []);
  const workflow = await getSourceInvoiceWorkflowStates(restaurantId, sourceIds);
  return invoices.map((invoice) => invoice.sourceDocumentId ? { ...invoice,
    alreadyCreditedBySimulation: workflow.get(invoice.sourceDocumentId)?.alreadyCreditedBySimulation ?? false } : invoice);
}

function sameDraft(prior: z.infer<typeof invoiceSchema>, draft: z.infer<typeof invoiceDraftSchema>) {
  return prior.reference === draft.reference && prior.date === draft.date &&
    prior.sourceTypeConfirmed === draft.sourceTypeConfirmed && prior.sourceDateConfirmed === draft.sourceDateConfirmed &&
    prior.lines.length === draft.lines.length && prior.lines.every((line, index) => {
      const candidate = draft.lines[index];
      return line.productId === candidate.productId && line.quantity === candidate.quantity && line.unitPrice === candidate.unitPrice &&
        line.unit === candidate.unit && line.sourceLineNumber === candidate.sourceLineNumber &&
        line.disposition === candidate.disposition && line.exclusionReason === candidate.exclusionReason;
    });
}

function validateSourceReview(source: z.infer<typeof sourceInvoiceDocumentSchema>, draft: z.infer<typeof invoiceDraftSchema>) {
  if (source.type !== "invoice") throw new WorkspaceError(409, "SOURCE_TYPE_NOT_RECEIVABLE", "Un avoir ou un bon de livraison ne peut pas créditer le stock par ce flux.");
  if (source.stockLines.length === 0) throw new WorkspaceError(409, "SOURCE_NO_LINES", "Aucune ligne de stock exploitable : consultez la pièce sans créer de réception.");
  if (!draft.sourceTypeConfirmed) throw new WorkspaceError(409, "SOURCE_TYPE_REVIEW_REQUIRED", "Confirmez d’abord que la pièce est bien une facture.");
  if (!draft.date || !draft.sourceDateConfirmed) throw new WorkspaceError(409, "SOURCE_DATE_REVIEW_REQUIRED", "Confirmez la date utilisée pour cette opération de démonstration.");
  const expected = new Set(source.stockLines.map((line) => line.sourceLineNumber));
  const received = new Set(draft.lines.flatMap((line) => line.sourceLineNumber === undefined ? [] : [line.sourceLineNumber]));
  if (draft.lines.length !== source.stockLines.length || expected.size !== received.size || [...expected].some((id) => !received.has(id))) {
    throw new WorkspaceError(409, "PARTIAL_RECEIPT_UNSUPPORTED", "La réception partielle n’est pas prise en charge : chaque ligne source doit être incluse ou explicitement écartée.");
  }
  for (const line of draft.lines) {
    if (line.disposition === "pending" || !line.disposition) throw new WorkspaceError(409, "SOURCE_REVIEW_REQUIRED", "Chaque ligne doit être rapprochée ou écartée explicitement.");
    if (line.disposition === "excluded" && !line.exclusionReason) throw new WorkspaceError(400, "EXCLUSION_REASON_REQUIRED", "Indiquez pourquoi cette ligne est écartée du stock.");
    if (line.disposition === "stock" && (!line.productId || !line.quantity || !line.unit)) {
      throw new WorkspaceError(400, "SOURCE_LINE_INCOMPLETE", "Chaque ligne incluse doit avoir un produit, une unité et une quantité vérifiés.");
    }
  }
}

export async function saveInvoice(restaurantId: string, actorId: string, id: string, revision: number,
  draft: z.infer<typeof invoiceDraftSchema>, receive: boolean) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const kind = `invoice:${id}`;
    const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    const prior = existing ? invoiceSchema.parse(existing.data) : null;
    const linkedSourceId = sourceIdFromInvoiceId(id);
    let source: z.infer<typeof sourceInvoiceDocumentSchema> | null = null;
    let sourceContentHash: string | undefined;
    let sourceDocumentRevision: number | undefined;
    if (linkedSourceId) {
      if (!existing || !prior) throw new WorkspaceError(404, "NOT_FOUND", "Brouillon source introuvable.");
      const sourceDoc = await getSourceDocument(tx, restaurantId, linkedSourceId);
      source = sourceDoc.source;
      sourceContentHash = source.contentHash;
      sourceDocumentRevision = sourceDoc.document.revision;
      if (prior.sourceDocumentId !== linkedSourceId || prior.sourceContentHash !== source.contentHash ||
          prior.sourceDocumentRevision !== sourceDoc.document.revision) {
        throw new WorkspaceError(409, "SOURCE_CHANGED", "La pièce source a changé depuis la création du brouillon.");
      }
    }
    if (prior?.status === "received") {
      if (receive && sameDraft(prior, draft)) return { ...prior, revision: existing!.revision };
      throw new WorkspaceError(409, "ALREADY_RECEIVED", "Cette facture a déjà été réceptionnée et ne peut plus être modifiée.");
    }
    if ((existing?.revision ?? 0) !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette facture a changé. Rechargez-la avant de poursuivre.");
    if (receive && !draft.date) throw new WorkspaceError(400, "INVALID_INVOICE_DATE", "Indiquez la date de l’opération avant réception.");
    if (receive && !linkedSourceId && !draft.lines.length) throw new WorkspaceError(400, "INVALID_INVOICE_LINE", "Ajoutez au moins une ligne avant réception.");
    if (!linkedSourceId && receive && draft.lines.some((line) => !line.productId || !line.quantity)) {
      throw new WorkspaceError(400, "INVALID_INVOICE_LINE", "Chaque ligne à réceptionner doit avoir un produit et une quantité positive.");
    }
    if (!linkedSourceId && new Set(draft.lines.map((line) => line.productId)).size !== draft.lines.length) {
      throw new WorkspaceError(400, "DUPLICATE_PRODUCT", "Une facture manuelle ne peut contenir qu’une ligne par produit.");
    }

    if (receive && source) {
      validateSourceReview(source, draft);
      const sourcePrefix = `${simulationVersion}:invoice:${linkedSourceId}:`;
      const priorSourceMovements = await tx.stockMovement.findMany({ where: { restaurantId, OR: [
        { sourceDocumentId: linkedSourceId }, { operationId: { startsWith: sourcePrefix } },
      ] }, select: { id: true } });
      if (priorSourceMovements.length) throw new WorkspaceError(409, "SOURCE_ALREADY_CREDITED",
        "Cette pièce a déjà crédité le stock dans la simulation. Le nouveau brouillon reste consultable mais ne peut pas ajouter un second crédit.");
    }

    const nextRevision = (existing?.revision ?? 0) + 1;
    const lines = draft.lines.map((line) => {
      if (!source || line.sourceLineNumber === undefined) return line;
      const sourceLine = source.stockLines.find((candidate) => candidate.sourceLineNumber === line.sourceLineNumber);
      if (!sourceLine) throw new WorkspaceError(409, "SOURCE_LINE_CHANGED", "Une ligne du brouillon ne correspond plus à la pièce source.");
      return { ...line, sourceName: sourceLine.name, sourceQuantityText: sourceLine.sourceQuantityText,
        sourceQuantity: sourceLine.quantity, sourceUnit: sourceLine.unit, sourceUnitPrice: sourceLine.unitPrice,
        sourcePriceBasis: sourceLine.priceBasis, sourceTaxBasis: sourceLine.priceTaxBasis,
        ...(sourceLine.code ? { sourceCode: sourceLine.code } : {}) };
    });
    const savedDraft = { ...draft, lines };
    if (receive) {
      const receivableLines = source ? savedDraft.lines.filter((line) => line.disposition === "stock") : savedDraft.lines;
      if (receivableLines.length === 0) throw new WorkspaceError(409, "NO_RECEIVABLE_LINES", "Aucune ligne n’a été incluse au stock.");
      for (const [index, line] of receivableLines.entries()) {
        const product = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id: line.productId } },
          include: { supplier: { select: { name: true } } } });
        if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit est absent de votre catalogue.");
        if (source && line.unit !== product.unit) throw new WorkspaceError(409, "UNIT_MISMATCH", `L’unité choisie ne correspond pas au stock de ${product.name}.`);
        const stockUpdated = await tx.product.updateMany({ where: { restaurantId, id: product.id }, data: {
          currentStock: { increment: line.quantity },
          stockRevision: { increment: 1 },
          ...(!product.lastDelivery || product.lastDelivery < new Date(draft.date) ? { lastDelivery: new Date(draft.date) } : {}),
        } });
        if (!stockUpdated.count) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit est absent de votre catalogue.");
        const operationId = source
          ? `${simulationVersion}:invoice:${linkedSourceId}:${line.sourceLineNumber ?? `manual-${index}`}:${product.id}`
          : `invoice:${id}`;
        await tx.stockMovement.create({ data: { restaurantId, productId: product.id, delta: line.quantity,
          reason: source ? "invoice_import_demo" : "receipt", operationId, actorId,
          productNameSnapshot: product.name, productUnitSnapshot: product.unit, supplierNameSnapshot: product.supplier.name,
          invoiceDocumentId: id, invoiceRevision: nextRevision,
          ...(source ? { sourceDocumentId: linkedSourceId, sourceContentHash, sourceDocumentRevision } : {}),
        } });
      }
    }

    const invoice = { ...savedDraft, id, source: prior?.source ?? (source ? "source_document" as const : "manual" as const),
      status: receive ? "received" as const : "draft" as const,
      ...(source ? { sourceDocumentId: linkedSourceId, sourceContentHash, sourceDocumentRevision,
        sourceTitle: prior?.sourceTitle, sourceSupplier: prior?.sourceSupplier, sourceType: prior?.sourceType,
        sourceStatus: prior?.sourceStatus, sourceDemoDate: prior?.sourceDemoDate,
        sourceOriginalDate: prior?.sourceOriginalDate, sourceLineCount: prior?.sourceLineCount,
        provenance: "demo_simulation" as const } : {}),
      ...(receive ? { receivedAt: new Date().toISOString(), receivedBy: actorId } : {}) };
    const saved = await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind } },
      create: { restaurantId, kind, data: invoice, revision: nextRevision },
      update: { data: invoice, revision: { increment: 1 } } });
    if (source && sourceContentHash !== undefined && sourceDocumentRevision !== undefined) {
      await tx.invoiceDraftRevision.create({ data: {
        restaurantId, invoiceDocumentId: id, sourceDocumentId: linkedSourceId!, sourceContentHash,
        sourceDocumentRevision, revision: saved.revision, actorId, data: invoiceSnapshot(invoice),
      } });
    }
    return { ...invoice, revision: saved.revision,
      ...(linkedSourceId ? { alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, linkedSourceId) } : {}) };
  });
}
