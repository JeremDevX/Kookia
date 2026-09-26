-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "deliveryWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "orderCutoffTime" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "orderPackQuantity" DECIMAL(14,3);

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN     "netQuantity" DECIMAL(14,3);

-- AlterTable
ALTER TABLE "RecipeVersionIngredient" ADD COLUMN     "netQuantity" DECIMAL(14,3);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "serviceSlot" TEXT;

-- AlterTable
ALTER TABLE "Production" ADD COLUMN     "serviceSlot" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ADD COLUMN     "deliveryNote" TEXT,
ADD COLUMN     "deliveryRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expectedDeliveryDate" DATE;

-- CreateTable
CREATE TABLE "RestaurantServiceSchedule" (
    "restaurantId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "actorId" TEXT NOT NULL,

    CONSTRAINT "RestaurantServiceSchedule_pkey" PRIMARY KEY ("restaurantId","weekday","slot")
);

-- CreateTable
CREATE TABLE "RestaurantServiceSession" (
    "restaurantId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "slot" TEXT NOT NULL,
    "plannedOpen" BOOLEAN NOT NULL,
    "coverage" "ServiceDayCoverage" NOT NULL DEFAULT 'missing',
    "actualCovers" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "actorId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantServiceSession_pkey" PRIMARY KEY ("restaurantId","serviceDate","slot")
);

-- CreateTable
CREATE TABLE "SaleServiceAllocation" (
    "restaurantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lunchQuantity" INTEGER NOT NULL DEFAULT 0,
    "dinnerQuantity" INTEGER NOT NULL DEFAULT 0,
    "saleRevision" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "actorId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleServiceAllocation_pkey" PRIMARY KEY ("restaurantId","saleId")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseReceiptLineId" TEXT,
    "receivedAt" DATE,
    "expiresAt" DATE,
    "quantityReceived" DECIMAL(14,3) NOT NULL,
    "remainingQuantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4),
    "source" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLotAllocation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "stockMovementId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "StockLotAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "serviceSlot" TEXT,
    "kind" TEXT NOT NULL,
    "avoidability" TEXT NOT NULL,
    "productId" TEXT,
    "lotId" TEXT,
    "productionId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "stockMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMenuVersion" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "slot" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMenuVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalIncident" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "serviceSlot" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "productId" TEXT,
    "lotId" TEXT,
    "orderLineId" TEXT,
    "recipeId" TEXT,
    "quantity" DECIMAL(14,3),
    "unit" TEXT,
    "note" TEXT NOT NULL,
    "actionNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OperationalIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseCredit" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLot_restaurantId_productId_expiresAt_idx" ON "StockLot"("restaurantId", "productId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_restaurantId_id_key" ON "StockLot"("restaurantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_restaurantId_purchaseReceiptLineId_key" ON "StockLot"("restaurantId", "purchaseReceiptLineId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLotAllocation_restaurantId_stockMovementId_lotId_key" ON "StockLotAllocation"("restaurantId", "stockMovementId", "lotId");

-- CreateIndex
CREATE INDEX "WasteRecord_restaurantId_serviceDate_serviceSlot_idx" ON "WasteRecord"("restaurantId", "serviceDate", "serviceSlot");

-- CreateIndex
CREATE UNIQUE INDEX "WasteRecord_restaurantId_operationId_key" ON "WasteRecord"("restaurantId", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "WasteRecord_restaurantId_stockMovementId_key" ON "WasteRecord"("restaurantId", "stockMovementId");

-- CreateIndex
CREATE INDEX "ServiceMenuVersion_restaurantId_serviceDate_slot_idx" ON "ServiceMenuVersion"("restaurantId", "serviceDate", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMenuVersion_restaurantId_serviceDate_slot_revision_key" ON "ServiceMenuVersion"("restaurantId", "serviceDate", "slot", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMenuVersion_restaurantId_operationId_key" ON "ServiceMenuVersion"("restaurantId", "operationId");

-- CreateIndex
CREATE INDEX "OperationalIncident_restaurantId_serviceDate_serviceSlot_idx" ON "OperationalIncident"("restaurantId", "serviceDate", "serviceSlot");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalIncident_restaurantId_operationId_key" ON "OperationalIncident"("restaurantId", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseCredit_restaurantId_operationId_key" ON "PurchaseCredit"("restaurantId", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseCredit_restaurantId_receiptId_reference_key" ON "PurchaseCredit"("restaurantId", "receiptId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_restaurantId_id_key" ON "StockMovement"("restaurantId", "id");

-- AddForeignKey
ALTER TABLE "RestaurantServiceSchedule" ADD CONSTRAINT "RestaurantServiceSchedule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantServiceSession" ADD CONSTRAINT "RestaurantServiceSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleServiceAllocation" ADD CONSTRAINT "SaleServiceAllocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleServiceAllocation" ADD CONSTRAINT "SaleServiceAllocation_restaurantId_saleId_fkey" FOREIGN KEY ("restaurantId", "saleId") REFERENCES "DailySale"("restaurantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_restaurantId_productId_fkey" FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_restaurantId_purchaseReceiptLineId_fkey" FOREIGN KEY ("restaurantId", "purchaseReceiptLineId") REFERENCES "PurchaseReceiptLine"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotAllocation" ADD CONSTRAINT "StockLotAllocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotAllocation" ADD CONSTRAINT "StockLotAllocation_restaurantId_lotId_fkey" FOREIGN KEY ("restaurantId", "lotId") REFERENCES "StockLot"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotAllocation" ADD CONSTRAINT "StockLotAllocation_restaurantId_stockMovementId_fkey" FOREIGN KEY ("restaurantId", "stockMovementId") REFERENCES "StockMovement"("restaurantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_restaurantId_productId_fkey" FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_restaurantId_lotId_fkey" FOREIGN KEY ("restaurantId", "lotId") REFERENCES "StockLot"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_restaurantId_productionId_fkey" FOREIGN KEY ("restaurantId", "productionId") REFERENCES "Production"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_restaurantId_stockMovementId_fkey" FOREIGN KEY ("restaurantId", "stockMovementId") REFERENCES "StockMovement"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMenuVersion" ADD CONSTRAINT "ServiceMenuVersion_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalIncident" ADD CONSTRAINT "OperationalIncident_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseCredit" ADD CONSTRAINT "PurchaseCredit_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseCredit" ADD CONSTRAINT "PurchaseCredit_restaurantId_receiptId_fkey" FOREIGN KEY ("restaurantId", "receiptId") REFERENCES "PurchaseReceipt"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- Keep raw storage invariants independent of the HTTP callers.
ALTER TABLE "RestaurantServiceSchedule" ADD CONSTRAINT "ServiceSchedule_valid" CHECK ("weekday" BETWEEN 0 AND 6 AND "slot" IN ('lunch', 'dinner'));
ALTER TABLE "RestaurantServiceSession" ADD CONSTRAINT "ServiceSession_valid" CHECK ("slot" IN ('lunch', 'dinner') AND ("actualCovers" IS NULL OR "actualCovers" >= 0));
ALTER TABLE "SaleServiceAllocation" ADD CONSTRAINT "ServiceAllocation_nonnegative" CHECK ("lunchQuantity" >= 0 AND "dinnerQuantity" >= 0);
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_valid" CHECK ("quantityReceived" >= 0 AND "remainingQuantity" >= 0 AND "remainingQuantity" <= "quantityReceived" AND ("unitCost" IS NULL OR "unitCost" >= 0) AND ("receivedAt" IS NULL OR "expiresAt" IS NULL OR "expiresAt" >= "receivedAt"));
ALTER TABLE "StockLotAllocation" ADD CONSTRAINT "LotAllocation_positive" CHECK ("quantity" > 0);
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_positive" CHECK ("quantity" > 0 AND ("serviceSlot" IS NULL OR "serviceSlot" IN ('lunch', 'dinner')));
ALTER TABLE "ServiceMenuVersion" ADD CONSTRAINT "ServiceMenu_slot" CHECK ("slot" IN ('lunch', 'dinner'));
ALTER TABLE "PurchaseCredit" ADD CONSTRAINT "PurchaseCredit_positive" CHECK ("amount" > 0);
