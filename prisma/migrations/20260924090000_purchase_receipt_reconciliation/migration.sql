ALTER TABLE "PurchaseOrderLine"
ADD COLUMN "restaurantId" TEXT;

UPDATE "PurchaseOrderLine" AS line
SET "restaurantId" = order_record."restaurantId"
FROM "PurchaseOrder" AS order_record
WHERE line."orderId" = order_record."id";

ALTER TABLE "PurchaseOrderLine"
ALTER COLUMN "restaurantId" SET NOT NULL;

CREATE UNIQUE INDEX "PurchaseOrder_restaurantId_id_key"
ON "PurchaseOrder"("restaurantId", "id");

CREATE UNIQUE INDEX "PurchaseOrderLine_restaurantId_id_key"
ON "PurchaseOrderLine"("restaurantId", "id");

ALTER TABLE "PurchaseOrderLine"
DROP CONSTRAINT "PurchaseOrderLine_orderId_fkey";

ALTER TABLE "PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_restaurantId_orderId_fkey"
FOREIGN KEY ("restaurantId", "orderId") REFERENCES "PurchaseOrder"("restaurantId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PurchaseReceipt" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "invoiceReference" TEXT NOT NULL,
  "invoiceReferenceNormalized" TEXT NOT NULL,
  "invoiceDocumentId" TEXT NOT NULL,
  "invoiceDocumentRevision" INTEGER NOT NULL,
  "deliveryReference" TEXT NOT NULL,
  "deliveryDate" DATE NOT NULL,
  "sourceDocumentId" TEXT,
  "sourceContentHash" TEXT,
  "simulated" BOOLEAN NOT NULL DEFAULT false,
  "provenance" TEXT NOT NULL DEFAULT 'recorded',
  "invoiceComplete" BOOLEAN NOT NULL DEFAULT false,
  "requestSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseReceiptLine" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "invoiceLineIndex" INTEGER NOT NULL,
  "invoiceQuantity" DECIMAL(14,3) NOT NULL,
  "receivedQuantity" DECIMAL(14,3) NOT NULL,
  "quantityDifference" DECIMAL(14,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "orderedQuantity" DECIMAL(14,3) NOT NULL,
  "orderedUnitPrice" DECIMAL(14,4) NOT NULL,
  "invoiceUnitPrice" DECIMAL(14,4) NOT NULL,
  "priceDifferenceReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseReceipt_restaurantId_operationId_key"
ON "PurchaseReceipt"("restaurantId", "operationId");
CREATE UNIQUE INDEX "PurchaseReceipt_restaurantId_supplierId_invoiceReferenceNormalized_deliveryReference_key"
ON "PurchaseReceipt"("restaurantId", "supplierId", "invoiceReferenceNormalized", "deliveryReference");
CREATE UNIQUE INDEX "PurchaseReceipt_restaurantId_invoiceDocumentId_deliveryReference_key"
ON "PurchaseReceipt"("restaurantId", "invoiceDocumentId", "deliveryReference");
CREATE UNIQUE INDEX "PurchaseReceipt_restaurantId_id_key"
ON "PurchaseReceipt"("restaurantId", "id");
CREATE INDEX "PurchaseReceipt_restaurantId_deliveryDate_idx"
ON "PurchaseReceipt"("restaurantId", "deliveryDate");

CREATE UNIQUE INDEX "PurchaseReceiptLine_restaurantId_id_key"
ON "PurchaseReceiptLine"("restaurantId", "id");
CREATE UNIQUE INDEX "PurchaseReceiptLine_restaurantId_receiptId_orderLineId_key"
ON "PurchaseReceiptLine"("restaurantId", "receiptId", "orderLineId");

ALTER TABLE "StockMovement"
ADD COLUMN "unitPriceSnapshot" DECIMAL(14,4),
ADD COLUMN "purchaseReceiptLineId" TEXT;

CREATE UNIQUE INDEX "StockMovement_restaurantId_purchaseReceiptLineId_key"
ON "StockMovement"("restaurantId", "purchaseReceiptLineId");

ALTER TABLE "PurchaseReceipt"
ADD CONSTRAINT "PurchaseReceipt_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PurchaseReceipt_restaurantId_orderId_fkey"
FOREIGN KEY ("restaurantId", "orderId") REFERENCES "PurchaseOrder"("restaurantId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PurchaseReceipt_restaurantId_supplierId_fkey"
FOREIGN KEY ("restaurantId", "supplierId") REFERENCES "Supplier"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "PurchaseReceiptLine"
ADD CONSTRAINT "PurchaseReceiptLine_restaurantId_receiptId_fkey"
FOREIGN KEY ("restaurantId", "receiptId") REFERENCES "PurchaseReceipt"("restaurantId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PurchaseReceiptLine_restaurantId_orderLineId_fkey"
FOREIGN KEY ("restaurantId", "orderLineId") REFERENCES "PurchaseOrderLine"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE,
ADD CONSTRAINT "PurchaseReceiptLine_restaurantId_productId_fkey"
FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_restaurantId_purchaseReceiptLineId_fkey"
FOREIGN KEY ("restaurantId", "purchaseReceiptLineId") REFERENCES "PurchaseReceiptLine"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Preserve receipt history while allowing the existing tenant-delete cascade to finish atomically.
ALTER TABLE "PurchaseReceiptLine"
ALTER CONSTRAINT "PurchaseReceiptLine_restaurantId_orderLineId_fkey" DEFERRABLE INITIALLY DEFERRED,
ALTER CONSTRAINT "PurchaseReceiptLine_restaurantId_productId_fkey" DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "StockMovement"
ALTER CONSTRAINT "StockMovement_restaurantId_purchaseReceiptLineId_fkey" DEFERRABLE INITIALLY DEFERRED;
