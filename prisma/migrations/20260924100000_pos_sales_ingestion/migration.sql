ALTER TYPE "SaleContributionSource" ADD VALUE 'pos';
ALTER TYPE "SaleContributionEventKind" ADD VALUE 'source_received';
CREATE TYPE "PosBatchCoverage" AS ENUM ('complete', 'partial');
CREATE TYPE "PosBatchProvenance" AS ENUM ('recorded_sales', 'demo_simulation');

CREATE TABLE "PosSyncState" (
  "restaurantId" TEXT NOT NULL,
  "provider" VARCHAR(60) NOT NULL,
  "cursor" VARCHAR(2000),
  "lastBatchId" VARCHAR(160),
  "lastSuccessAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosSyncState_pkey" PRIMARY KEY ("restaurantId", "provider"),
  CONSTRAINT "PosSyncState_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "PosSyncState_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE "PosSalesBatch" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "provider" VARCHAR(60) NOT NULL,
  "batchId" VARCHAR(160) NOT NULL,
  "fromDate" DATE NOT NULL,
  "toDate" DATE NOT NULL,
  "cursorBefore" VARCHAR(2000),
  "cursorAfter" VARCHAR(2000),
  "coverage" "PosBatchCoverage" NOT NULL,
  "provenance" "PosBatchProvenance" NOT NULL,
  "contentHash" CHAR(64) NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "candidateCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateRecordCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PosSalesBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosSalesBatch_window_check" CHECK ("fromDate" <= "toDate"),
  CONSTRAINT "PosSalesBatch_recordCount_check" CHECK ("recordCount" >= 0),
  CONSTRAINT "PosSalesBatch_candidateCount_check" CHECK ("candidateCount" >= 0 AND "duplicateRecordCount" >= 0),
  CONSTRAINT "PosSalesBatch_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "PosSalesBatch_restaurantId_id_key" ON "PosSalesBatch"("restaurantId", "id");
CREATE UNIQUE INDEX "PosSalesBatch_restaurantId_provider_batchId_key"
  ON "PosSalesBatch"("restaurantId", "provider", "batchId");
CREATE INDEX "PosSalesBatch_restaurantId_fromDate_toDate_idx"
  ON "PosSalesBatch"("restaurantId", "fromDate", "toDate");

CREATE TABLE "PosArticleMapping" (
  "restaurantId" TEXT NOT NULL,
  "provider" VARCHAR(60) NOT NULL,
  "externalItemId" VARCHAR(120) NOT NULL,
  "saleItemId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PosArticleMapping_pkey" PRIMARY KEY ("restaurantId", "provider", "externalItemId"),
  CONSTRAINT "PosArticleMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "PosArticleMapping_restaurantId_saleItemId_fkey" FOREIGN KEY ("restaurantId", "saleItemId")
    REFERENCES "SaleItem"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX "PosArticleMapping_restaurantId_saleItemId_idx"
  ON "PosArticleMapping"("restaurantId", "saleItemId");

ALTER TABLE "SaleContribution"
  ADD COLUMN "posBatchId" TEXT,
  ADD COLUMN "sourceRecordId" VARCHAR(160),
  ADD COLUMN "sourceExternalItemId" VARCHAR(120),
  ADD COLUMN "sourceRefunded" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SaleContribution"
  ADD CONSTRAINT "SaleContribution_restaurantId_posBatchId_fkey"
    FOREIGN KEY ("restaurantId", "posBatchId") REFERENCES "PosSalesBatch"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
