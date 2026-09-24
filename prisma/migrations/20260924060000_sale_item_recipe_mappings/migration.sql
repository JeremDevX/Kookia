CREATE TABLE "SaleItemRecipeMapping" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "saleItemId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "recipeName" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "portionsPerItem" DECIMAL(14,3) NOT NULL,
  "operationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleItemRecipeMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SaleItemRecipeMapping_fields_check" CHECK ("revision" > 0 AND "portionsPerItem" > 0)
);

CREATE UNIQUE INDEX "SaleItemRecipeMapping_restaurantId_id_key"
  ON "SaleItemRecipeMapping"("restaurantId", "id");
CREATE UNIQUE INDEX "SaleItemRecipeMapping_restaurantId_operationId_key"
  ON "SaleItemRecipeMapping"("restaurantId", "operationId");
CREATE UNIQUE INDEX "SaleItemRecipeMapping_restaurantId_saleItemId_revision_key"
  ON "SaleItemRecipeMapping"("restaurantId", "saleItemId", "revision");
CREATE UNIQUE INDEX "SaleItemRecipeMapping_restaurantId_saleItemId_effectiveFrom_key"
  ON "SaleItemRecipeMapping"("restaurantId", "saleItemId", "effectiveFrom");
CREATE INDEX "SaleItemRecipeMapping_restaurantId_saleItemId_effectiveFrom_revision_idx"
  ON "SaleItemRecipeMapping"("restaurantId", "saleItemId", "effectiveFrom", "revision");

ALTER TABLE "SaleItemRecipeMapping"
  ADD CONSTRAINT "SaleItemRecipeMapping_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "SaleItemRecipeMapping_restaurantId_saleItemId_fkey"
    FOREIGN KEY ("restaurantId", "saleItemId") REFERENCES "SaleItem"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "SaleItemRecipeMapping_restaurantId_recipeId_fkey"
    FOREIGN KEY ("restaurantId", "recipeId") REFERENCES "Recipe"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
