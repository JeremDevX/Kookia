CREATE TYPE "WorkspaceMode" AS ENUM ('operational', 'demo');

ALTER TABLE "Restaurant"
ADD COLUMN "mode" "WorkspaceMode" NOT NULL DEFAULT 'operational';

ALTER TABLE "PurchaseOrderLine"
ADD COLUMN "suggestionDecisionId" TEXT;

CREATE UNIQUE INDEX "PurchaseOrderLine_suggestionDecisionId_key"
ON "PurchaseOrderLine"("suggestionDecisionId");

ALTER TABLE "PurchaseOrderLine"
ADD CONSTRAINT "PurchaseOrderLine_suggestionDecisionId_fkey"
FOREIGN KEY ("suggestionDecisionId") REFERENCES "RecommendationDecision"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
