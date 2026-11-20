import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma, type PurchaseOrderLine } from "@prisma/client";
import { workshopApprovedPurchaseReference } from "../../../../shared/workshopOrders.js";
import { invoiceSchema } from "./invoiceData.js";
import { checkInvoiceDuplicates, invoiceKey } from "./invoiceDuplicates.js";
import { simulationActor } from "./operationProvenance.js";
import { findWorkshopApprovedLines } from "./workshopApprovedOrders.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";
import { workshopStockLotId } from "./workshopStockService.js";
import { WorkspaceError } from "./workspaceError.js";

type Purchase = WorkshopOperationsInput["purchases"][number];
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const quantity = (milli: number) => new Prisma.Decimal(milli).div(1000);
const price = (cents: number) => new Prisma.Decimal(cents).div(100);
const productKey = ({ name, unit }: { name: string; unit: string }) => `${name}\0${unit}`;
const receiptOperationId = (reference: string) => `workshop-receipt:v1:${reference}`;
function workshopInvoiceId(reference: string) {
  const hex = createHash("sha256").update(`workshop-invoice:v1:${reference}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function conflict(reference: string) {
  return new WorkspaceError(409, "WORKSHOP_PURCHASE_CONFLICT", `La commande ${reference} ne correspond pas aux achats de l’espace de test.`);
}

async function workshopOrder(tx: Prisma.TransactionClient, restaurantId: string, purchase: Purchase, requireExistingOrder: boolean) {
  const suppliers = await tx.supplier.findMany({ where: { restaurantId, name: purchase.supplier }, select: { id: true, name: true } });
  if (suppliers.length !== 1) throw conflict(purchase.reference);
  const supplier = suppliers[0];
  const products = await tx.product.findMany({
    where: { restaurantId, supplierId: supplier.id, OR: purchase.lines.map(({ name, unit }) => ({ name, unit })) },
    select: { id: true, name: true, unit: true },
  });
  const expectedDeliveryDate = dateValue(purchase.expectedOn);
  const orderLines = purchase.lines.map(line => {
    const matches = products.filter(product => productKey(product) === productKey(line));
    if (matches.length !== 1) throw conflict(purchase.reference);
    return { productId: matches[0].id, productName: line.name, supplierId: supplier.id, supplierName: supplier.name,
      quantity: quantity(line.orderedMilli), unit: line.unit, pricePerUnit: price(line.unitPriceCents), expectedDeliveryDate,
      deliveryNote: purchase.reference };
  });
  const operationId = `workshop-purchase:v1:${purchase.reference}`;
  const existing = await tx.purchaseOrder.findUnique({
    where: { restaurantId_operationId: { restaurantId, operationId } }, include: { lines: true },
  });
  const matchesOrderLines = (lines: PurchaseOrderLine[], matchPrice: boolean) => lines.length === orderLines.length &&
    orderLines.every(input => lines.some(line => line.productId === input.productId && line.supplierId === input.supplierId &&
      line.supplierName === input.supplierName && line.productName === input.productName && line.unit === input.unit &&
      line.quantity.equals(input.quantity) && (!matchPrice || line.pricePerUnit.equals(input.pricePerUnit)) &&
      line.expectedDeliveryDate?.getTime() === expectedDeliveryDate.getTime()));
  if (existing) {
    if (existing.actorId !== simulationActor || !existing.status.startsWith("simulated") ||
        existing.createdAt.toISOString().slice(0, 10) !== purchase.orderedOn || !matchesOrderLines(existing.lines, true)) {
      throw conflict(purchase.reference);
    }
    return existing;
  }

  const notePrefix = `${purchase.reference} du ${purchase.orderedOn}.`;
  const candidates = (await tx.purchaseOrder.findMany({
    where: { restaurantId, lines: { some: { deliveryNote: { startsWith: notePrefix } } } },
    include: { lines: true, receipts: { select: { operationId: true, simulated: true } } },
  })).filter(order => order.lines.some(line => line.deliveryNote?.startsWith(notePrefix)));
  if (candidates.length > 0) {
    const [candidate] = candidates;
    const receipt = purchase.receipt;
    const suffix = purchase.reference.slice(3);
    const isWorkshopDelivery = purchase.reference.startsWith(`BC-${purchase.orderedOn}-`) &&
      receipt?.deliveryReference === `BL-${suffix}` && receipt.invoiceReference === `FA-${suffix}`;
    const isPending = candidate.status === "validated" && candidate.receipts.length === 0;
    const isAlreadyLinked = candidate.status.startsWith("simulated_") && candidate.receipts.length === 1 &&
      candidate.receipts[0].simulated && candidate.receipts[0].operationId === receiptOperationId(purchase.reference);
    if (candidates.length !== 1 || !isWorkshopDelivery || !purchase.lines.some(line => line.receivedMilli > 0) ||
        (!isPending && !isAlreadyLinked) || !matchesOrderLines(candidate.lines, false) ||
        candidate.lines.some(line => !line.deliveryNote?.startsWith(notePrefix))) {
      throw conflict(purchase.reference);
    }
    return candidate;
  }

  if (requireExistingOrder) throw conflict(purchase.reference);
  return tx.purchaseOrder.create({ data: { restaurantId, actorId: simulationActor, operationId, status: "simulated",
    createdAt: new Date(`${purchase.orderedOn}T12:00:00Z`), lines: { create: orderLines } }, include: { lines: true } });
}

async function recordWorkshopReceipt(tx: Prisma.TransactionClient, restaurantId: string, date: string, purchase: Purchase,
  order: { id: string; lines: PurchaseOrderLine[] }) {
  const receipt = purchase.receipt;
  if (!receipt) return;
  const { supplierId } = order.lines[0];
  const invoiceDocumentId = workshopInvoiceId(purchase.reference);
  const operationId = receiptOperationId(purchase.reference);
  const lines = [...purchase.lines].sort((a, b) => productKey(a).localeCompare(productKey(b), "fr-FR"));
  const snapshot = { purchase: { ...purchase, lines }, date };
  const prior = await tx.purchaseReceipt.findFirst({ where: { restaurantId, orderId: order.id } });
  if (prior) {
    if (prior.operationId !== operationId || !prior.simulated || !isDeepStrictEqual(prior.requestSnapshot, snapshot))
      throw conflict(purchase.reference);
    return;
  }

  const receivedLines = lines.map((input, invoiceLineIndex) => {
    const line = order.lines.find(entry => entry.productName === input.name && entry.unit === input.unit);
    if (!line) throw conflict(purchase.reference);
    const receivedQuantity = quantity(input.receivedMilli);
    const invoiceUnitPrice = price(input.unitPriceCents);
    return { orderLineId: line.id, productId: line.productId, productName: line.productName, invoiceLineIndex,
      invoiceQuantity: line.quantity, receivedQuantity, quantityDifference: line.quantity.minus(receivedQuantity),
      unit: line.unit, orderedQuantity: line.quantity, orderedUnitPrice: line.pricePerUnit, invoiceUnitPrice,
      ...(invoiceUnitPrice.equals(line.pricePerUnit) ? {} : { priceDifferenceReason: "Prix d’origine de la commande conservé, avec le prix de la facture de l’atelier." }) };
  });
  const invoiceComplete = receivedLines.every(line => line.quantityDifference.isZero());
  const docKind = `invoice:${invoiceDocumentId}`;
  const invoice = invoiceSchema.parse({ id: invoiceDocumentId, reference: receipt.invoiceReference, date: receipt.invoiceOn, supplierId,
    status: invoiceComplete ? "received" : "draft", source: "demo", provenance: "demo_simulation", stockEffect: "none",
    ...(invoiceComplete ? { receivedAt: new Date().toISOString(), receivedBy: simulationActor } : {}),
    lines: receivedLines.map(line => ({ productId: line.productId, quantity: Number(line.invoiceQuantity),
      unit: line.unit, unitPrice: Number(line.invoiceUnitPrice) })) });
  const existingInvoice = await tx.workspaceDocument.findFirst({ where: { restaurantId, kind: { startsWith: "invoice:" },
    AND: [{ data: { path: ["reference"], equals: receipt.invoiceReference } }, { data: { path: ["supplierId"], equals: supplierId } }],
  }, select: { kind: true, data: true } });
  if (existingInvoice && (existingInvoice.kind !== docKind || !isDeepStrictEqual(existingInvoice.data, invoice)))
    throw conflict(purchase.reference);
  if (!existingInvoice) await tx.workspaceDocument.create({ data: { restaurantId, kind: docKind, data: invoice } });
  if (!receivedLines.some(line => line.receivedQuantity.greaterThan(0))) return;

  const invoiceReferenceNormalized = invoiceKey(receipt.invoiceReference);
  const conflictingReceipt = await tx.purchaseReceipt.findFirst({ where: { restaurantId, supplierId, invoiceReferenceNormalized,
    deliveryReference: receipt.deliveryReference }, select: { id: true } });
  if (conflictingReceipt) throw conflict(purchase.reference);
  await tx.purchaseReceipt.create({ data: { restaurantId, orderId: order.id, supplierId, actorId: simulationActor, operationId,
    invoiceReference: receipt.invoiceReference, invoiceReferenceNormalized, invoiceDocumentId, invoiceDocumentRevision: 0,
    deliveryReference: receipt.deliveryReference, deliveryDate: dateValue(date), simulated: true, provenance: "demo_simulation",
    invoiceComplete, requestSnapshot: snapshot, lines: { create: receivedLines },
  } });
  await tx.purchaseOrder.update({ where: { restaurantId_id: { restaurantId, id: order.id } },
    data: { status: invoiceComplete ? "simulated_received" : "simulated_partially_received" } });
}

async function recordApprovedWorkshopReceipt(tx: Prisma.TransactionClient, restaurantId: string, date: string, purchase: Purchase) {
  const { approvedOrderId: orderId, receipt } = purchase;
  const [input] = purchase.lines;
  const lineId = input.approvedLineId;
  const mismatch = new WorkspaceError(409, "WORKSHOP_APPROVED_ORDER_CONFLICT",
    "La commande validée ou son reliquat a changé depuis la préparation de cette réception.");
  if (!orderId || !lineId || !receipt || purchase.reference !== workshopApprovedPurchaseReference(date, lineId) ||
      receipt.deliveryReference !== `BL-${purchase.reference.slice(3)}` || receipt.invoiceReference !== `FA-${purchase.reference.slice(3)}`) throw mismatch;

  const operationId = receiptOperationId(purchase.reference);
  const snapshot = { purchase, date };
  const prior = await tx.purchaseReceipt.findUnique({ where: { restaurantId_operationId: { restaurantId, operationId } } });
  if (prior) {
    if (!prior.simulated || prior.actorId !== simulationActor || prior.orderId !== orderId ||
        !isDeepStrictEqual(prior.requestSnapshot, snapshot)) throw mismatch;
    return;
  }

  const [approved] = await findWorkshopApprovedLines(tx, restaurantId, date, { orderId, lineId });
  if (!approved || approved.orderedOn !== purchase.orderedOn || approved.dueOn !== purchase.expectedOn ||
      approved.supplier !== purchase.supplier || approved.name !== input.name || approved.unit !== input.unit ||
      approved.unitPriceCents !== input.unitPriceCents || approved.quantityMilli !== input.orderedMilli ||
      input.receivedMilli > approved.quantityMilli) throw mismatch;
  if (input.receivedMilli === 0) return;

  const { productId, supplierId, productName, unit, quantity: orderedQuantity, pricePerUnit: orderedUnitPrice } = approved.line;
  const receivedQuantity = quantity(input.receivedMilli);
  const invoiceUnitPrice = price(input.unitPriceCents);
  const deliveryDate = dateValue(date);
  const reference = `LOT-${purchase.reference}`;
  const [movement, lot] = await Promise.all([
    tx.stockMovement.findUnique({ where: { restaurantId_operationId_productId: { restaurantId, productId,
      operationId: `workshop-stock:v1:${date}:${reference}:in` } } }),
    tx.stockLot.findUnique({ where: { restaurantId_id: { restaurantId, id: workshopStockLotId(restaurantId, productId, reference) } },
      include: { product: { select: { supplierId: true, unit: true } } } }),
  ]);
  if (!movement || movement.reason !== "simulation_restock" || movement.purchaseReceiptLineId || !movement.delta.eq(receivedQuantity) ||
      !lot || lot.productId !== productId || lot.source !== "demo_simulation" || lot.purchaseReceiptLineId ||
      lot.product.supplierId !== supplierId || lot.product.unit !== unit ||
      lot.receivedAt?.getTime() !== deliveryDate.getTime() || !lot.quantityReceived.eq(receivedQuantity) || !lot.unitCost?.eq(invoiceUnitPrice)) throw mismatch;

  const invoiceReferenceNormalized = invoiceKey(receipt.invoiceReference);
  const conflictingReceipt = await tx.purchaseReceipt.findFirst({ where: { restaurantId, supplierId, invoiceReferenceNormalized,
    deliveryReference: receipt.deliveryReference }, select: { id: true } });
  if (conflictingReceipt) throw mismatch;
  const invoiceDocumentId = workshopInvoiceId(purchase.reference);
  const invoice = invoiceSchema.parse({ id: invoiceDocumentId, reference: receipt.invoiceReference, date: receipt.invoiceOn, supplierId,
    status: "received", source: "demo", provenance: "demo_simulation", stockEffect: "demo_simulation",
    receivedAt: new Date().toISOString(), receivedBy: simulationActor,
    lines: [{ productId, quantity: Number(receivedQuantity), unit, unitPrice: Number(invoiceUnitPrice) }] });
  const kind = `invoice:${invoiceDocumentId}`;
  if (await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } })) throw mismatch;
  await checkInvoiceDuplicates(tx, restaurantId, invoiceDocumentId, supplierId, receipt.invoiceReference);
  const { revision: invoiceDocumentRevision } = await tx.workspaceDocument.create({ data: { restaurantId, kind, data: invoice } });
  const saved = await tx.purchaseReceipt.create({ data: { restaurantId, orderId, supplierId, actorId: simulationActor, operationId,
    invoiceReference: receipt.invoiceReference, invoiceReferenceNormalized, invoiceDocumentId, invoiceDocumentRevision,
    deliveryReference: receipt.deliveryReference, deliveryDate, simulated: true, provenance: "demo_simulation",
    invoiceComplete: true, requestSnapshot: snapshot, lines: { create: [{ orderLineId: lineId, productId, productName, unit,
      orderedQuantity, orderedUnitPrice, receivedQuantity, invoiceQuantity: receivedQuantity, invoiceLineIndex: 0, quantityDifference: 0,
      invoiceUnitPrice, ...(invoiceUnitPrice.equals(orderedUnitPrice) ? {} : { priceDifferenceReason: "Prix de la facture simulée arrondi au centime." }),
    }] } }, select: { lines: { select: { id: true } } } });
  const purchaseReceiptLineId = saved.lines[0].id;
  await tx.stockMovement.update({ where: { restaurantId_id: { restaurantId, id: movement.id } },
    data: { purchaseReceiptLineId, invoiceDocumentId, invoiceRevision: invoiceDocumentRevision, unitPriceSnapshot: invoiceUnitPrice } });
  await tx.stockLot.update({ where: { restaurantId_id: { restaurantId, id: lot.id } }, data: { purchaseReceiptLineId } });

  const orderLines = await tx.purchaseOrderLine.findMany({ where: { restaurantId, orderId },
    select: { quantity: true, receiptLines: { select: { receivedQuantity: true } } } });
  const orderComplete = orderLines.every(line => line.receiptLines.reduce((left, { receivedQuantity: received }) =>
    left.minus(received), line.quantity).lte(0));
  await tx.purchaseOrder.update({ where: { restaurantId_id: { restaurantId, id: orderId } },
    data: { status: orderComplete ? "simulated_received" : "simulated_partially_received" } });
}

export async function applyWorkshopPurchases(tx: Prisma.TransactionClient, restaurantId: string, date: string,
  purchases: WorkshopOperationsInput["purchases"], requireExistingOrder = false) {
  for (const purchase of purchases) {
    if (purchase.approvedOrderId) await recordApprovedWorkshopReceipt(tx, restaurantId, date, purchase);
    else {
      const order = await workshopOrder(tx, restaurantId, purchase, requireExistingOrder);
      await recordWorkshopReceipt(tx, restaurantId, date, purchase, order);
    }
  }
}
