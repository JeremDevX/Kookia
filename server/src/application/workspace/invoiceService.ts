import { checkInvoiceDuplicates } from "./invoiceDuplicates.js";
import { invoiceSchema, recordSourceInvoiceRevision } from "./invoiceData.js";
import { creditReceiptStock, getReceiptProduct, lockReceiptProducts, lockReceiptWorkspace } from "./receiptStock.js";
import { isSimulationStockMovement, simulatedInvoiceOperationPrefix, stockReceiptProvenance } from "./stockMovementProvenance.js";
import { Prisma, type WorkspaceMode } from "@prisma/client";
import { z } from "zod";
import { sourceInvoiceLineSchema, sourceInvoiceTypeSchema, type Invoice, type InvoiceDraft,
  type InvoiceStockEffect, type SaveInvoiceRequest, type SourceInvoiceSummary } from "../../../../shared/invoice.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";

export const sourceInvoiceDocumentSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1).max(500), date: z.iso.date().nullable(), originalDate: z.iso.date().nullable(),
  supplier: z.string().min(1).max(200), type: sourceInvoiceTypeSchema, status: z.string().max(200),
  content: z.string(), stockLines: z.array(sourceInvoiceLineSchema).max(100),
});

export function sourceInvoiceContentForWorkspace(content: string, workingDate: string | null) {
  return content.split(/\r?\n/).flatMap((line) => {
    if (/^- Date[^\n]*\(pièce d’origine\)\s*:/i.test(line)) return [];
    if (/^- Date décalée de la pièce \(démonstration\)\s*:/i.test(line))
      return [`- Date de travail : ${workingDate ?? "inconnue"}`];
    return [line];
  }).join("\n");
}

export const initialInvoice = { id: "demo", reference: "Rungis-2024-12-09", date: "2024-12-09", status: "draft" as const, source: "demo" as const,
  lines: [{ productId: "p1", quantity: 12, unitPrice: 2.4 }, { productId: "p2", quantity: 5, unitPrice: 8.5 },
    { productId: "p15", quantity: 3, unitPrice: 1.5 }, { productId: "p4", quantity: 10, unitPrice: 12 }] };

const sourceInvoiceKind = (sourceDocumentId: string) => `invoice:source:${sourceDocumentId}`;
const sourceInvoiceId = (sourceDocumentId: string) => `source:${sourceDocumentId}`;
const sourceIdFromInvoiceId = (invoiceId: string) => invoiceId.match(/^source:([a-f0-9]{24})$/)?.[1];
const simulationVersion = "restaurant-simulation-v1";
const simulationActor = "restaurant-simulation:v1";
const sourceMovementPrefix = (sourceDocumentId: string) => `${simulationVersion}:invoice:${sourceDocumentId}:`;
const sourceStockEffect = (mode?: WorkspaceMode) => mode === "demo" ? "demo_simulation" as const : "none" as const;

type SourceInvoiceWorkflowState = Pick<SourceInvoiceSummary,
  "invoiceId" | "invoiceStatus" | "receivedAt" | "alreadyCreditedBySimulation" | "sourceMovementCount">;

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
    const prefix = sourceMovementPrefix(sourceId);
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
  return !!await tx.stockMovement.findFirst({ where: {
    restaurantId, actorId: simulationActor, reason: "invoice_import_demo", invoiceDocumentId: null,
    operationId: { startsWith: sourceMovementPrefix(sourceDocumentId) },
  }, select: { id: true } });
}

export async function rejectPriorSourceCredit(tx: Prisma.TransactionClient, restaurantId: string, sourceDocumentId: string) {
  const priorCredit = await tx.stockMovement.findFirst({ where: { restaurantId, OR: [
    { sourceDocumentId }, { operationId: { startsWith: sourceMovementPrefix(sourceDocumentId) } },
  ] }, select: { id: true } });
  if (priorCredit) throw new WorkspaceError(409, "SOURCE_ALREADY_CREDITED",
    "Un mouvement de stock est déjà lié à cette pièce. Le brouillon reste consultable.");
}

async function historicalStockEffect(tx: Prisma.TransactionClient, restaurantId: string, invoiceDocumentId: string,
  mode: WorkspaceMode): Promise<InvoiceStockEffect> {
  const movement = await tx.stockMovement.findFirst({ where: { restaurantId, invoiceDocumentId },
    select: { reason: true, actorId: true, operationId: true, purchaseReceiptLine: stockReceiptProvenance } });
  if (!movement) return "none";
  return isSimulationStockMovement(movement, mode) ? "demo_simulation" : "recorded";
}

function candidateLine(sourceLine: z.infer<typeof sourceInvoiceLineSchema>) {
  return {
    productId: "", quantity: 0, unitPrice: 0, unit: "", sourceLineNumber: sourceLine.sourceLineNumber,
    disposition: "pending" as const, sourceName: sourceLine.name, sourceQuantityText: sourceLine.sourceQuantityText,
    sourceQuantity: sourceLine.quantity, sourceUnit: sourceLine.unit, sourceUnitPrice: sourceLine.unitPrice,
    sourcePriceBasis: sourceLine.priceBasis, sourceTaxBasis: sourceLine.priceTaxBasis,
    ...(sourceLine.code ? { sourceCode: sourceLine.code } : {}),
  };
}

export async function createInvoiceDraftFromSource(restaurantId: string, actorId: string, sourceDocumentId: string) {
  return prisma.$transaction(async (tx) => {
    const mode = await lockReceiptWorkspace(tx, restaurantId);
    const { document, source } = await getSourceDocument(tx, restaurantId, sourceDocumentId);
    const sourceReceiptStockEffect = sourceStockEffect(mode);
    const kind = sourceInvoiceKind(sourceDocumentId);
    const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    if (existing) {
      const invoice = invoiceSchema.parse(existing.data);
      if (invoice.sourceContentHash !== source.contentHash || invoice.sourceDocumentRevision !== document.revision) {
        throw new WorkspaceError(409, "SOURCE_CHANGED", "La pièce source a changé depuis la création du brouillon. Reprenez-la pour vérifier les différences.");
      }
      return { ...invoice, revision: existing.revision, sourceReceiptStockEffect,
        alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, sourceDocumentId) };
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
    await recordSourceInvoiceRevision(tx, restaurantId, actorId, invoice, saved.revision);
    return { ...invoice, revision: saved.revision, sourceReceiptStockEffect,
      alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, sourceDocumentId) };
  });
}

export async function getInvoices(restaurantId: string) {
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "invoice:" } }, orderBy: { updatedAt: "desc" } });
  const invoices = documents.map((document) => ({ ...invoiceSchema.parse(document.data), revision: document.revision }));
  const sourceIds = invoices.flatMap((invoice) => invoice.sourceDocumentId ? [invoice.sourceDocumentId] : []);
  const [workflow, workspace] = await Promise.all([
    getSourceInvoiceWorkflowStates(restaurantId, sourceIds),
    sourceIds.length ? prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }) : null,
  ]);
  const sourceReceiptStockEffect = sourceStockEffect(workspace?.mode);
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const receipts = invoiceIds.length ? await prisma.purchaseReceipt.findMany({ where: { restaurantId, invoiceDocumentId: { in: invoiceIds } },
    select: { invoiceDocumentId: true, lines: { select: { invoiceLineIndex: true, orderLineId: true, receivedQuantity: true } } } }) : [];
  const progressByInvoice = new Map<string, NonNullable<Invoice["receiptProgress"]>>();
  for (const receipt of receipts) progressByInvoice.set(receipt.invoiceDocumentId,
    [...(progressByInvoice.get(receipt.invoiceDocumentId) ?? []), ...receipt.lines.map((line) => ({ ...line,
      receivedQuantity: Number(line.receivedQuantity) }))]);
  return invoices.map((invoice) => ({ ...invoice,
    ...(invoice.sourceDocumentId ? { sourceReceiptStockEffect,
      alreadyCreditedBySimulation: workflow.get(invoice.sourceDocumentId)?.alreadyCreditedBySimulation ?? false } : {}),
    ...(progressByInvoice.has(invoice.id) ? { receiptProgress: progressByInvoice.get(invoice.id) } : {}),
  }));
}

function sameDraft(prior: z.infer<typeof invoiceSchema>, draft: InvoiceDraft) {
  return prior.reference === draft.reference && prior.date === draft.date &&
    prior.supplierId === draft.supplierId &&
    prior.sourceTypeConfirmed === draft.sourceTypeConfirmed && prior.sourceDateConfirmed === draft.sourceDateConfirmed &&
    prior.lines.length === draft.lines.length && prior.lines.every((line, index) => {
      const candidate = draft.lines[index];
      return line.productId === candidate.productId && line.quantity === candidate.quantity && line.unitPrice === candidate.unitPrice &&
        line.unit === candidate.unit && line.sourceLineNumber === candidate.sourceLineNumber &&
        line.disposition === candidate.disposition && line.exclusionReason === candidate.exclusionReason;
    });
}

export function validateSourceReview(source: z.infer<typeof sourceInvoiceDocumentSchema>, draft: InvoiceDraft) {
  if (source.type !== "invoice") throw new WorkspaceError(409, "SOURCE_TYPE_NOT_RECEIVABLE", "Un avoir ou un bon de livraison ne peut pas créditer le stock par ce flux.");
  if (source.stockLines.length === 0) throw new WorkspaceError(409, "SOURCE_NO_LINES", "Aucune ligne de stock exploitable : consultez la pièce sans créer de réception.");
  if (!draft.sourceTypeConfirmed) throw new WorkspaceError(409, "SOURCE_TYPE_REVIEW_REQUIRED", "Confirmez d’abord que la pièce est bien une facture.");
  if (!draft.date || !draft.sourceDateConfirmed) throw new WorkspaceError(409, "SOURCE_DATE_REVIEW_REQUIRED", "Confirmez la date de la pièce avant de poursuivre.");
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
  draft: InvoiceDraft, receive: boolean, confirmedDuplicates?: SaveInvoiceRequest["confirmedDuplicates"]) {
  return prisma.$transaction(async (tx) => {
    const mode = await lockReceiptWorkspace(tx, restaurantId);
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
    const sourceReceiptStockEffect = sourceStockEffect(mode);
    const sourceEffect = linkedSourceId ? { sourceReceiptStockEffect,
      alreadyCreditedBySimulation: await hasSimulationCredit(tx, restaurantId, linkedSourceId) } : {};
    if (prior?.status === "received") {
      if (receive && sameDraft(prior, draft)) {
        const stockEffect = prior.stockEffect ?? await historicalStockEffect(tx, restaurantId, id, mode);
        return { ...prior, ...sourceEffect, revision: existing!.revision, stockEffect };
      }
      throw new WorkspaceError(409, "ALREADY_RECEIVED", "Cette facture a déjà été réceptionnée et ne peut plus être modifiée.");
    }
    if ((existing?.revision ?? 0) !== revision) throw new WorkspaceError(409, "REVISION_CONFLICT", "Cette facture a changé. Rechargez-la avant de poursuivre.");
    const priorReceipt = await tx.purchaseReceipt.findFirst({ where: { restaurantId, invoiceDocumentId: id }, select: { id: true } });
    if (priorReceipt) {
      if (!receive && prior && sameDraft(prior, draft))
        return { ...prior, ...sourceEffect, revision: existing!.revision, stockEffect: "none" as const };
      throw new WorkspaceError(409, "INVOICE_PARTIALLY_RECONCILED", "Cette facture a commencé à être rapprochée d’une commande; poursuivez dans l’écran de réception.");
    }
    if (draft.supplierId && !await tx.supplier.findUnique({ where: { restaurantId_id: { restaurantId, id: draft.supplierId } }, select: { id: true } }))
      throw new WorkspaceError(400, "INVALID_SUPPLIER", "Le fournisseur de la facture est absent de votre espace.");
    if (receive && !draft.date) throw new WorkspaceError(400, "INVALID_INVOICE_DATE", "Indiquez la date de l’opération avant réception.");
    if (receive && !linkedSourceId && !draft.lines.length) throw new WorkspaceError(400, "INVALID_INVOICE_LINE", "Ajoutez au moins une ligne avant réception.");
    if (!linkedSourceId && receive && draft.lines.some((line) => !line.productId || !line.quantity)) {
      throw new WorkspaceError(400, "INVALID_INVOICE_LINE", "Chaque ligne à réceptionner doit avoir un produit et une quantité positive.");
    }
    if (!linkedSourceId && new Set(draft.lines.map((line) => line.productId)).size !== draft.lines.length) {
      throw new WorkspaceError(400, "DUPLICATE_PRODUCT", "Une facture manuelle ne peut contenir qu’une ligne par produit.");
    }

    if (receive && prior?.source === "demo" && mode !== "demo")
      throw new WorkspaceError(409, "DEMO_INVOICE_IN_OPERATIONAL_WORKSPACE", "Une facture d’exemple ne peut pas ajouter de quantités au stock de cet espace.");
    if (receive && !linkedSourceId && prior?.source !== "demo")
      await checkInvoiceDuplicates(tx, restaurantId, id, draft.supplierId, draft.reference, confirmedDuplicates);

    if (receive && source && linkedSourceId) {
      validateSourceReview(source, draft);
      await rejectPriorSourceCredit(tx, restaurantId, linkedSourceId);
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
    const stockEffect: InvoiceStockEffect = !receive ? "none" : source ? sourceReceiptStockEffect
      : mode === "demo" ? "demo_simulation" : "recorded";
    if (receive) {
      const receivableLines = source ? savedDraft.lines.filter((line) => line.disposition === "stock") : savedDraft.lines;
      if (receivableLines.length === 0) throw new WorkspaceError(409, "NO_RECEIVABLE_LINES", "Aucune ligne n’a été retenue.");
      await lockReceiptProducts(tx, restaurantId, receivableLines.map((line) => line.productId));
      const deliveryDate = new Date(draft.date);
      for (const line of receivableLines) {
        const product = await getReceiptProduct(tx, restaurantId, line.productId);
        if (!product) throw new WorkspaceError(400, "INVALID_PRODUCT", "Un produit est absent de votre catalogue.");
        if ((source || line.unit) && line.unit !== product.unit) throw new WorkspaceError(409, "UNIT_MISMATCH", `L’unité choisie ne correspond pas au stock de ${product.name}.`);
        if (stockEffect === "none") continue;
        const operationId = linkedSourceId
          ? `${sourceMovementPrefix(linkedSourceId)}${line.sourceLineNumber}:${product.id}`
          : mode === "demo" ? `${simulatedInvoiceOperationPrefix}${id}` : `invoice:${id}`;
        await creditReceiptStock(tx, restaurantId, product, deliveryDate, {
          delta: line.quantity, reason: source ? "invoice_import_demo" : "receipt", operationId, actorId,
          unitPriceSnapshot: new Prisma.Decimal(line.unitPrice), invoiceDocumentId: id, invoiceRevision: nextRevision,
          ...(source ? { sourceDocumentId: linkedSourceId, sourceContentHash, sourceDocumentRevision } : {}),
        });
      }
    }

    const invoice = { ...savedDraft, id, source: prior?.source ?? (source ? "source_document" as const : "manual" as const),
      status: receive ? "received" as const : "draft" as const,
      ...(source ? { sourceDocumentId: linkedSourceId, sourceContentHash, sourceDocumentRevision,
        sourceTitle: prior?.sourceTitle, sourceSupplier: prior?.sourceSupplier, sourceType: prior?.sourceType,
        sourceStatus: prior?.sourceStatus, sourceDemoDate: prior?.sourceDemoDate,
        sourceOriginalDate: prior?.sourceOriginalDate, sourceLineCount: prior?.sourceLineCount,
        provenance: "demo_simulation" as const } : {}),
      ...(receive ? { receivedAt: new Date().toISOString(), receivedBy: actorId, stockEffect } : {}) };
    const saved = await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind } },
      create: { restaurantId, kind, data: invoice, revision: nextRevision },
      update: { data: invoice, revision: { increment: 1 } } });
    await recordSourceInvoiceRevision(tx, restaurantId, actorId, invoice, saved.revision);
    return { ...invoice, ...sourceEffect, revision: saved.revision, stockEffect };
  });
}
