CREATE TABLE "InventorySession" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'validated')),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "lines" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "InventorySession_one_draft" ON "InventorySession" ("restaurantId") WHERE "status" = 'draft';
ALTER TABLE "StockCount" ADD COLUMN "inventoryReason" TEXT;
