CREATE TYPE "SaleContributionSource" AS ENUM ('manual', 'csv', 'demo_simulation');
CREATE TYPE "SaleContributionStatus" AS ENUM ('pending', 'accepted', 'rejected', 'superseded', 'voided');
CREATE TYPE "SaleContributionEventKind" AS ENUM ('accepted', 'conflict_detected', 'rejected', 'replaced', 'corrected', 'voided', 'refund_recorded');
CREATE TYPE "ServiceDaySource" AS ENUM ('recorded', 'demo_simulation', 'mixed');

ALTER TABLE "ServiceDay" ADD COLUMN "source" "ServiceDaySource" NOT NULL DEFAULT 'recorded';
UPDATE "ServiceDay" sd SET "source" = CASE
  WHEN sd."actorId" = 'restaurant-simulation:v1' THEN 'demo_simulation'::"ServiceDaySource"
  WHEN EXISTS (SELECT 1 FROM "DailySale" ds WHERE ds."restaurantId" = sd."restaurantId" AND ds."serviceDate" = sd."serviceDate" AND ds."source" = 'demo_simulation')
    AND EXISTS (SELECT 1 FROM "DailySale" ds WHERE ds."restaurantId" = sd."restaurantId" AND ds."serviceDate" = sd."serviceDate" AND ds."source" <> 'demo_simulation')
    THEN 'mixed'::"ServiceDaySource"
  WHEN EXISTS (SELECT 1 FROM "DailySale" ds WHERE ds."restaurantId" = sd."restaurantId" AND ds."serviceDate" = sd."serviceDate" AND ds."source" = 'demo_simulation')
    THEN 'demo_simulation'::"ServiceDaySource"
  ELSE 'recorded'::"ServiceDaySource"
END;

ALTER TABLE "SaleImport"
  ADD COLUMN "mappingHash" TEXT,
  ADD COLUMN "mappingSnapshot" JSONB,
  ADD COLUMN "conflictCount" INTEGER NOT NULL DEFAULT 0;
UPDATE "SaleImport"
SET "mappingHash" = 'legacy:' || "id", "mappingSnapshot" = '{}'::jsonb;
ALTER TABLE "SaleImport"
  ALTER COLUMN "mappingHash" SET NOT NULL,
  ALTER COLUMN "mappingSnapshot" SET NOT NULL;
DROP INDEX "SaleImport_restaurantId_fileHash_key";
ALTER TABLE "DailySale" DROP CONSTRAINT "DailySale_importId_fkey";
CREATE UNIQUE INDEX "SaleImport_restaurantId_fileHash_mappingHash_key"
  ON "SaleImport"("restaurantId", "fileHash", "mappingHash");
CREATE UNIQUE INDEX "SaleImport_restaurantId_id_key" ON "SaleImport"("restaurantId", "id");

CREATE TABLE "SaleContribution" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "source" "SaleContributionSource" NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceRevision" INTEGER NOT NULL DEFAULT 1,
  "importId" TEXT,
  "importLine" INTEGER,
  "sourceItemName" VARCHAR(120) NOT NULL,
  "sourceDate" VARCHAR(40) NOT NULL,
  "serviceDate" DATE,
  "sourceQuantity" VARCHAR(32) NOT NULL,
  "quantity" INTEGER,
  "saleItemId" TEXT,
  "status" "SaleContributionStatus" NOT NULL,
  "reviewRevision" INTEGER NOT NULL DEFAULT 0,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewReason" VARCHAR(240),
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleContribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaleContribution_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0),
  CONSTRAINT "SaleContribution_revision_check" CHECK ("sourceRevision" > 0 AND "reviewRevision" >= 0),
  CONSTRAINT "SaleContribution_accepted_fields_check" CHECK ("status" <> 'accepted' OR
    ("serviceDate" IS NOT NULL AND "quantity" IS NOT NULL AND "saleItemId" IS NOT NULL)),
  CONSTRAINT "SaleContribution_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "SaleContribution_restaurantId_id_key" ON "SaleContribution"("restaurantId", "id");
CREATE UNIQUE INDEX "SaleContribution_restaurantId_sourceKey_key" ON "SaleContribution"("restaurantId", "sourceKey");
CREATE INDEX "SaleContribution_restaurantId_status_createdAt_idx" ON "SaleContribution"("restaurantId", "status", "createdAt");
CREATE INDEX "SaleContribution_restaurantId_serviceDate_saleItemId_idx" ON "SaleContribution"("restaurantId", "serviceDate", "saleItemId");

ALTER TABLE "SaleContribution"
  ADD CONSTRAINT "SaleContribution_restaurantId_importId_fkey"
    FOREIGN KEY ("restaurantId", "importId") REFERENCES "SaleImport"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "SaleContribution_restaurantId_saleItemId_fkey"
    FOREIGN KEY ("restaurantId", "saleItemId") REFERENCES "SaleItem"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "SaleContribution_restaurantId_supersedesId_fkey"
    FOREIGN KEY ("restaurantId", "supersedesId") REFERENCES "SaleContribution"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "DailySale" ADD COLUMN "contributionId" TEXT;
INSERT INTO "SaleContribution" (
  "id", "restaurantId", "source", "sourceKey", "sourceRevision", "importId", "importLine",
  "sourceItemName", "sourceDate", "serviceDate", "sourceQuantity", "quantity", "saleItemId",
  "status", "reviewRevision", "reviewedBy", "reviewedAt", "reviewReason", "createdAt"
)
SELECT gen_random_uuid()::text, ds."restaurantId",
  CASE ds."source" WHEN 'csv' THEN 'csv'::"SaleContributionSource"
    WHEN 'demo_simulation' THEN 'demo_simulation'::"SaleContributionSource"
    ELSE 'manual'::"SaleContributionSource" END,
  CASE WHEN ds."source" = 'demo_simulation' THEN ds."operationId" ELSE 'legacy:' || ds."id" END,
  1, ds."importId", ds."importLine", si."name",
  ds."serviceDate"::text, ds."serviceDate", ds."quantity"::text, ds."quantity", ds."saleItemId",
  'accepted', 1, ds."updatedBy", ds."updatedAt", 'Contribution historique migrée sans réinterpréter la vente.', ds."createdAt"
FROM "DailySale" ds
JOIN "SaleItem" si ON si."restaurantId" = ds."restaurantId" AND si."id" = ds."saleItemId";

UPDATE "DailySale" ds SET "contributionId" = sc."id"
FROM "SaleContribution" sc WHERE sc."restaurantId" = ds."restaurantId" AND sc."sourceKey" =
  CASE WHEN ds."source" = 'demo_simulation' THEN ds."operationId" ELSE 'legacy:' || ds."id" END;

CREATE TABLE "SaleContributionEvent" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "kind" "SaleContributionEventKind" NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" VARCHAR(240) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleContributionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaleContributionEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "SaleContributionEvent_restaurantId_contributionId_fkey" FOREIGN KEY ("restaurantId", "contributionId")
    REFERENCES "SaleContribution"("restaurantId", "id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "SaleContributionEvent_restaurantId_operationId_key"
  ON "SaleContributionEvent"("restaurantId", "operationId");
CREATE INDEX "SaleContributionEvent_restaurantId_contributionId_createdAt_idx"
  ON "SaleContributionEvent"("restaurantId", "contributionId", "createdAt");

INSERT INTO "SaleContributionEvent" ("id", "restaurantId", "contributionId", "operationId", "revision", "kind", "actorId", "reason", "snapshot", "createdAt")
SELECT gen_random_uuid()::text, sc."restaurantId", sc."id", 'legacy:' || sc."id", 1, 'accepted',
  sc."reviewedBy", sc."reviewReason", jsonb_build_object('source', sc."source", 'serviceDate', sc."sourceDate", 'itemName', sc."sourceItemName", 'quantity', sc."sourceQuantity"), sc."reviewedAt"
FROM "SaleContribution" sc;

CREATE UNIQUE INDEX "DailySale_contributionId_key" ON "DailySale"("contributionId");
CREATE UNIQUE INDEX "DailySale_restaurantId_id_key" ON "DailySale"("restaurantId", "id");
CREATE UNIQUE INDEX "DailySale_restaurantId_contributionId_key" ON "DailySale"("restaurantId", "contributionId");
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_restaurantId_importId_fkey"
  FOREIGN KEY ("restaurantId", "importId") REFERENCES "SaleImport"("restaurantId", "id")
  ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_restaurantId_contributionId_fkey"
  FOREIGN KEY ("restaurantId", "contributionId") REFERENCES "SaleContribution"("restaurantId", "id")
  ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
