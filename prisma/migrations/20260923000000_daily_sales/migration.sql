CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaleItem_restaurantId_normalizedName_key" ON "SaleItem"("restaurantId", "normalizedName");
CREATE UNIQUE INDEX "SaleItem_restaurantId_id_key" ON "SaleItem"("restaurantId", "id");
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DailySale" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "operationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailySale_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailySale_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "DailySale_restaurantId_serviceDate_saleItemId_key" ON "DailySale"("restaurantId", "serviceDate", "saleItemId");
CREATE UNIQUE INDEX "DailySale_restaurantId_operationId_key" ON "DailySale"("restaurantId", "operationId");
CREATE INDEX "DailySale_restaurantId_serviceDate_idx" ON "DailySale"("restaurantId", "serviceDate");

ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_restaurantId_saleItemId_fkey" FOREIGN KEY ("restaurantId", "saleItemId") REFERENCES "SaleItem"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
