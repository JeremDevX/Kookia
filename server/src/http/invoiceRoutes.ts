import express, { Router, type Response } from "express";
import { z } from "zod";
import { saveInvoiceRequestSchema, type SaveInvoiceResponse, type SourceInvoiceDetail,
  type SourceInvoiceSummary } from "../../../shared/invoice.js";
import { invoiceDto } from "../application/workspace/invoiceData.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { describeInvoiceFile, unconfiguredInvoiceExtractionAdapter, type InvoiceExtractionAdapter } from "../integrations/invoiceExtractionAdapter.js";
import { inspectInvoiceExtractionUpload } from "../integrations/invoiceExtractionUpload.js";
import { extractInvoiceCandidate } from "../application/workspace/invoiceExtractionService.js";
import { createInvoiceDraftFromSource, getInvoices, getSourceInvoiceWorkflowStates,
  saveInvoice, sourceInvoiceContentForWorkspace, sourceInvoiceDocumentSchema } from "../application/workspace/invoiceService.js";
export const invoiceRoutes = Router();
const context = (res: Response) => res.locals.workspace as { restaurantId: string; actorId: string };
const extractionAdapter = (res: Response) =>
  (res.locals.invoiceExtractionAdapter as InvoiceExtractionAdapter | undefined) ?? unconfiguredInvoiceExtractionAdapter;
const extractionUnavailable = (res: Response) => res.status(503).json({ error: { code: "EXTRACTION_UNAVAILABLE",
  message: "La lecture automatique n’est pas disponible pour cette pièce. Vous pouvez la saisir manuellement." } });

invoiceRoutes.get("/invoice-extraction/status", (_req, res) => {
  const mode = extractionAdapter(res).provider === "local_demo_fixture" ? "demo_fixture" : "manual";
  res.json({ mode });
});
invoiceRoutes.post("/invoice-extractions", (_req, res, next) => {
  if (extractionAdapter(res).provider === "unconfigured") { extractionUnavailable(res); return; }
  next();
}, express.raw({ type: () => true, limit: "4mb", inflate: false }), async (req, res) => {
  const inspection = inspectInvoiceExtractionUpload(req.get("content-type"), req.body);
  if (!inspection.valid) {
    res.status(inspection.status).json({ error: { code: inspection.code, message: inspection.message } });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: { code: "INVALID_INVOICE_FILE", message: "Le fichier source est vide ou illisible." } });
    return;
  }
  const { restaurantId } = context(res);
  const file = describeInvoiceFile(req.body, inspection.metadata.mimeType);
  const result = await extractInvoiceCandidate(restaurantId, file, req.body, extractionAdapter(res));
  if (result.status === "unavailable") {
    extractionUnavailable(res);
    return;
  }
  res.status(result.created ? 201 : 200).json({ id: result.source.id });
});

invoiceRoutes.get("/source-invoices", async (_req, res) => {
  const { restaurantId } = context(res);
  const documents = await prisma.workspaceDocument.findMany({ where: { restaurantId, kind: { startsWith: "source-invoice:" } }, select: { data: true } });
  const invoices = documents.map(({ data }) => sourceInvoiceDocumentSchema.parse(data));
  const workflow = await getSourceInvoiceWorkflowStates(restaurantId, invoices.map((invoice) => invoice.id));
  const summaries = invoices.map((invoice): SourceInvoiceSummary => ({
    id: invoice.id, title: invoice.title, date: invoice.date,
    supplier: invoice.supplier, type: invoice.type, status: invoice.status, stockLineCount: invoice.stockLines.length,
    ...workflow.get(invoice.id)!,
  })).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title));
  res.json(summaries);
});
invoiceRoutes.get("/source-invoices/:id", async (req, res) => {
  const id = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
  const { restaurantId } = context(res);
  const document = await prisma.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: `source-invoice:${id}` } } });
  if (!document) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Pièce introuvable." } }); return; }
  const invoice = sourceInvoiceDocumentSchema.parse(document.data);
  const workflow = await getSourceInvoiceWorkflowStates(restaurantId, [invoice.id]);
  const detail: SourceInvoiceDetail = {
    id: invoice.id, title: invoice.title, date: invoice.date,
    supplier: invoice.supplier, type: invoice.type, status: invoice.status, stockLineCount: invoice.stockLines.length,
    content: sourceInvoiceContentForWorkspace(invoice.content, invoice.date),
    stockLines: invoice.stockLines, ...workflow.get(invoice.id)!,
  };
  res.json(detail);
});
invoiceRoutes.get("/invoices", async (_req, res) => {
  res.json((await getInvoices(context(res).restaurantId)).map(invoiceDto));
});
invoiceRoutes.post("/invoices/from-source/:id", async (req, res) => {
  const sourceDocumentId = z.string().regex(/^[a-f0-9]{24}$/).parse(req.params.id);
  const { restaurantId, actorId } = context(res);
  res.json(invoiceDto(await createInvoiceDraftFromSource(restaurantId, actorId, sourceDocumentId)));
});
invoiceRoutes.post("/invoices/:id", async (req, res) => {
  const id = z.union([z.literal("demo"), z.uuid(), z.string().regex(/^source:[a-f0-9]{24}$/)]).parse(req.params.id);
  const { draft, revision, receive, confirmedDuplicates } = saveInvoiceRequestSchema.parse(req.body);
  const { restaurantId, actorId } = context(res);
  const saved = await saveInvoice(restaurantId, actorId, id, revision, draft, receive, confirmedDuplicates);
  const response: SaveInvoiceResponse = { ...invoiceDto(saved), stockEffect: saved.stockEffect };
  res.json(response);
});
