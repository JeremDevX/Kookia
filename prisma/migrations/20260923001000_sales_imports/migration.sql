CREATE TABLE "SaleImport" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "acceptedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaleImport_restaurantId_fileHash_key" ON "SaleImport"("restaurantId", "fileHash");
ALTER TABLE "SaleImport" ADD CONSTRAINT "SaleImport_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailySale" ADD COLUMN "importId" TEXT;
ALTER TABLE "DailySale" ADD COLUMN "importLine" INTEGER;
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SaleImport"("id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
