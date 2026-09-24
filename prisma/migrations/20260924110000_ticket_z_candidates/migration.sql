ALTER TYPE "SaleContributionSource" ADD VALUE 'ticket_z';
CREATE TYPE "TicketZBatchStatus" AS ENUM ('uploaded', 'candidates', 'no_details', 'reviewed');
CREATE TYPE "TicketZBatchProvenance" AS ENUM ('recorded_sales', 'demo_simulation');

CREATE TABLE "TicketZBatch" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "contentHash" CHAR(64) NOT NULL,
  "mimeType" VARCHAR(40) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sourceDateText" VARCHAR(80),
  "serviceDate" DATE,
  "status" "TicketZBatchStatus" NOT NULL DEFAULT 'uploaded',
  "provenance" "TicketZBatchProvenance" NOT NULL,
  "candidateHash" CHAR(64),
  "recordCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketZBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketZBatch_byteSize_check" CHECK ("byteSize" BETWEEN 1 AND 4194304),
  CONSTRAINT "TicketZBatch_recordCount_check" CHECK ("recordCount" >= 0),
  CONSTRAINT "TicketZBatch_restaurantId_fkey" FOREIGN KEY ("restaurantId")
    REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX "TicketZBatch_restaurantId_id_key" ON "TicketZBatch"("restaurantId", "id");
CREATE UNIQUE INDEX "TicketZBatch_restaurantId_contentHash_key" ON "TicketZBatch"("restaurantId", "contentHash");
CREATE INDEX "TicketZBatch_restaurantId_createdAt_idx" ON "TicketZBatch"("restaurantId", "createdAt");

ALTER TABLE "SaleContribution"
  ADD COLUMN "ticketBatchId" TEXT,
  ADD COLUMN "ticketLineNumber" INTEGER,
  ADD CONSTRAINT "SaleContribution_ticketLineNumber_check"
    CHECK ("ticketLineNumber" IS NULL OR "ticketLineNumber" > 0),
  ADD CONSTRAINT "SaleContribution_restaurantId_ticketBatchId_fkey"
    FOREIGN KEY ("restaurantId", "ticketBatchId") REFERENCES "TicketZBatch"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX "SaleContribution_restaurantId_ticketBatchId_idx"
  ON "SaleContribution"("restaurantId", "ticketBatchId");
