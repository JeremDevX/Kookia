ALTER TABLE "StockMovement"
ADD COLUMN "sourceDocumentId" TEXT,
ADD COLUMN "sourceContentHash" TEXT,
ADD COLUMN "sourceDocumentRevision" INTEGER,
ADD COLUMN "invoiceDocumentId" TEXT,
ADD COLUMN "invoiceRevision" INTEGER;

CREATE INDEX "StockMovement_restaurantId_sourceDocumentId_idx"
ON "StockMovement"("restaurantId", "sourceDocumentId");

CREATE TABLE "InvoiceDraftRevision" (
    "restaurantId" TEXT NOT NULL,
    "invoiceDocumentId" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "sourceDocumentRevision" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDraftRevision_pkey" PRIMARY KEY ("restaurantId", "invoiceDocumentId", "revision")
);

CREATE INDEX "InvoiceDraftRevision_restaurantId_sourceDocumentId_createdAt_idx"
ON "InvoiceDraftRevision"("restaurantId", "sourceDocumentId", "createdAt");

ALTER TABLE "InvoiceDraftRevision"
ADD CONSTRAINT "InvoiceDraftRevision_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
