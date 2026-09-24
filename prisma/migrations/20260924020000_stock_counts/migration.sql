ALTER TABLE "Product"
ADD COLUMN "stockRevision" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "countedQuantity" DECIMAL(14,3) NOT NULL,
    "theoreticalQuantity" DECIMAL(14,3) NOT NULL,
    "delta" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "stockRevisionBefore" INTEGER NOT NULL,
    "stockRevisionAfter" INTEGER NOT NULL,
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "countDate" DATE NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("restaurantId", "id")
);

ALTER TABLE "StockMovement"
ADD COLUMN "stockCountId" TEXT;

CREATE UNIQUE INDEX "StockCount_restaurantId_operationId_key"
ON "StockCount"("restaurantId", "operationId");

CREATE INDEX "StockCount_restaurantId_productId_countedAt_idx"
ON "StockCount"("restaurantId", "productId", "countedAt");

CREATE INDEX "StockMovement_restaurantId_stockCountId_idx"
ON "StockMovement"("restaurantId", "stockCountId");

ALTER TABLE "StockCount"
ADD CONSTRAINT "StockCount_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "StockCount"
ADD CONSTRAINT "StockCount_restaurantId_productId_fkey"
FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_restaurantId_stockCountId_fkey"
FOREIGN KEY ("restaurantId", "stockCountId") REFERENCES "StockCount"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
