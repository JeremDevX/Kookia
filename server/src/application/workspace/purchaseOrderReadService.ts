import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { purchaseReceiptDto } from "./purchaseReceiptService.js";

const pendingStatuses = ["validated", "partially_received", "simulated", "simulated_partially_received"];
const receivedStatuses = ["received", "simulated_received"];
const orderBy = [{ createdAt: "desc" }, { id: "desc" }] satisfies Prisma.PurchaseOrderOrderByWithRelationInput[];
const receiptsWithMovements = {
  include: { lines: { include: { movement: { select: { id: true } } } } },
  orderBy: { createdAt: "desc" },
} as const;
const historyInclude = { lines: true, receipts: receiptsWithMovements } as const;
type PurchaseOrderWithReceipts = Prisma.PurchaseOrderGetPayload<{ include: typeof historyInclude }>;
type ReceiptQuantities = Map<string, Prisma.Decimal>;

function totalReceived(order: PurchaseOrderWithReceipts): ReceiptQuantities {
  const receivedByLine: ReceiptQuantities = new Map();
  for (const receipt of order.receipts) for (const line of receipt.lines)
    receivedByLine.set(line.orderLineId, (receivedByLine.get(line.orderLineId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
  return receivedByLine;
}

function orderDtoWithReceipts(order: PurchaseOrderWithReceipts, receivedByLine = totalReceived(order)) {
  return { id: order.id, status: order.status, createdAt: order.createdAt.toISOString(),
    lines: order.lines.map((line) => {
      const receivedQuantity = receivedByLine.get(line.id) ?? new Prisma.Decimal(0);
      const remainingQuantity = Prisma.Decimal.max(0, line.quantity.minus(receivedQuantity));
      return { id: line.id, productId: line.productId, productName: line.productName, supplierId: line.supplierId,
        supplierName: line.supplierName, expectedDeliveryDate: line.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
        deliveryRevision: line.deliveryRevision, deliveryNote: line.deliveryNote,
        quantity: Number(line.quantity), receivedQuantity: Number(receivedQuantity), remainingQuantity: Number(remainingQuantity),
        unit: line.unit, pricePerUnit: Number(line.pricePerUnit) };
    }), receipts: order.receipts.map(purchaseReceiptDto),
  };
}

export async function listPurchaseOrders(restaurantId: string, pending = false) {
  const orders = await prisma.purchaseOrder.findMany({
    where: { restaurantId, ...(pending ? { status: { in: pendingStatuses } } : {}) }, include: historyInclude, orderBy,
  });
  return orders.map((order) => orderDtoWithReceipts(order));
}

export async function listPlanningOrders(restaurantId: string, date: string) {
  const day = new Date(`${date}T00:00:00.000Z`);
  const expectedByDay: Prisma.PurchaseOrderLineWhereInput = {
    OR: [{ expectedDeliveryDate: { lte: day } }, { expectedDeliveryDate: null }],
  };
  const receiptsOnDay = { deliveryDate: day };
  const orders = await prisma.purchaseOrder.findMany({
    where: { restaurantId, OR: [
      { status: { in: pendingStatuses }, lines: { some: expectedByDay } },
      { receipts: { some: receiptsOnDay } },
    ] },
    include: {
      lines: { where: expectedByDay, include: { receiptLines: { select: { receivedQuantity: true } } } },
      receipts: { ...receiptsWithMovements, where: receiptsOnDay },
    },
    orderBy,
  });
  return orders.flatMap((order) => {
    const received: ReceiptQuantities = new Map(order.lines.map((line) => [line.id,
      line.receiptLines.reduce((sum, receipt) => sum.plus(receipt.receivedQuantity), new Prisma.Decimal(0))]));
    const dto = orderDtoWithReceipts(order, received);
    dto.lines = dto.lines.filter((line) => line.remainingQuantity > 0);
    return dto.lines.length > 0 || dto.receipts.length > 0 ? [dto] : [];
  });
}

interface HistoryQuery {
  page: number;
  query?: string;
  supplierId?: string;
  status?: "all" | "pending" | "received";
  orderId?: string;
  receiptId?: string;
}

const pageSize = 10;

function historyTextSearch(query: string): Prisma.PurchaseOrderWhereInput[] {
  const literal = (value: string) => value.replace(/[\\%_]/g, "\\$&");
  const contains = { contains: literal(query), mode: "insensitive" as const };
  const pairs = [...query.matchAll(/ /g)].map(({ index }) => ({
    first: { endsWith: literal(query.slice(0, index)), mode: "insensitive" as const },
    second: { startsWith: literal(query.slice(index + 1)), mode: "insensitive" as const },
  }));
  return [
    { id: contains },
    { lines: { some: { OR: [{ productName: contains }, { supplierName: contains },
      ...pairs.map(({ first, second }) => ({ productName: first, supplierName: second })),
    ] } } },
    { receipts: { some: { OR: [{ invoiceReference: contains }, { deliveryReference: contains },
      ...pairs.map(({ first, second }) => ({ deliveryReference: first, invoiceReference: second })),
    ] } } },
  ];
}

export async function listPurchaseOrderHistory(restaurantId: string, input: HistoryQuery) {
  const { query, supplierId, status, orderId, receiptId } = input;
  const scope = { restaurantId };
  const statuses = status === "pending" ? pendingStatuses : status === "received" ? receivedStatuses : undefined;
  const where: Prisma.PurchaseOrderWhereInput = {
    ...scope,
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(supplierId ? { lines: { some: { supplierId } } } : {}),
    ...(query ? { OR: historyTextSearch(query) } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const [statusCounts, suppliers, filteredTotal] = await Promise.all([
      tx.purchaseOrder.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
      tx.purchaseOrderLine.groupBy({ by: ["supplierId"], where: scope, _max: { supplierName: true } }),
      query || supplierId || statuses ? tx.purchaseOrder.count({ where }) : undefined,
    ]);
    const total = statusCounts.reduce((sum, result) => sum + result._count._all, 0);
    const filteredCount = filteredTotal ?? total;
    const pageCount = Math.ceil(filteredCount / pageSize);
    const page = Math.min(input.page, Math.max(0, pageCount - 1));
    const orders = await tx.purchaseOrder.findMany({ where, include: historyInclude, orderBy, skip: page * pageSize, take: pageSize });
    const targetOnPage = orders.some((order) => orderId ? order.id === orderId : order.receipts.some((receipt) => receipt.id === receiptId));
    const target = !targetOnPage && (orderId || receiptId)
      ? await tx.purchaseOrder.findFirst({
        where: { ...scope, ...(orderId ? { id: orderId } : { receipts: { some: { id: receiptId } } }) },
        include: historyInclude,
      })
      : null;
    return { restaurantId, page, pageCount, total, filteredCount,
      statusCounts: Object.fromEntries(statusCounts.map((result) => [result.status, result._count._all])),
      suppliers: suppliers.map(({ supplierId: id, _max }) => ({ id, name: _max.supplierName ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
      orders: orders.map((order) => orderDtoWithReceipts(order)),
      targetOrder: target ? orderDtoWithReceipts(target) : null,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
