ALTER TABLE "Recipe"
  ADD COLUMN "yieldPortions" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "Recipe_yieldPortions_check" CHECK ("yieldPortions" > 0);

CREATE TABLE "RecipeVersion" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "effectiveFrom" DATE,
  "operationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "prepTime" INTEGER NOT NULL,
  "yieldPortions" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecipeVersion_fields_check" CHECK ("version" > 0 AND "prepTime" >= 0 AND "yieldPortions" > 0)
);
CREATE UNIQUE INDEX "RecipeVersion_restaurantId_id_key" ON "RecipeVersion"("restaurantId", "id");
CREATE UNIQUE INDEX "RecipeVersion_restaurantId_recipeId_version_key"
  ON "RecipeVersion"("restaurantId", "recipeId", "version");
CREATE UNIQUE INDEX "RecipeVersion_restaurantId_operationId_key" ON "RecipeVersion"("restaurantId", "operationId");
CREATE INDEX "RecipeVersion_restaurantId_recipeId_effectiveFrom_version_idx"
  ON "RecipeVersion"("restaurantId", "recipeId", "effectiveFrom", "version");

CREATE TABLE "RecipeVersionIngredient" (
  "restaurantId" TEXT NOT NULL,
  "recipeVersionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productUnit" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  CONSTRAINT "RecipeVersionIngredient_pkey" PRIMARY KEY ("restaurantId", "recipeVersionId", "productId"),
  CONSTRAINT "RecipeVersionIngredient_quantity_check" CHECK ("quantity" > 0)
);

ALTER TABLE "RecipeVersion"
  ADD CONSTRAINT "RecipeVersion_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "RecipeVersion_restaurantId_recipeId_fkey"
    FOREIGN KEY ("restaurantId", "recipeId") REFERENCES "Recipe"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "RecipeVersionIngredient"
  ADD CONSTRAINT "RecipeVersionIngredient_restaurantId_recipeVersionId_fkey"
    FOREIGN KEY ("restaurantId", "recipeVersionId") REFERENCES "RecipeVersion"("restaurantId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
  ADD CONSTRAINT "RecipeVersionIngredient_restaurantId_productId_fkey"
    FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

INSERT INTO "RecipeVersion" (
  "id", "restaurantId", "recipeId", "version", "effectiveFrom", "operationId", "actorId",
  "name", "category", "prepTime", "yieldPortions"
)
SELECT gen_random_uuid()::text, r."restaurantId", r."id", r."revision", NULL,
  'legacy:recipe:' || r."id" || ':v' || r."revision", 'migration:recipe-version-backfill',
  r."name", r."category", r."prepTime", r."yieldPortions"
FROM "Recipe" r;

INSERT INTO "RecipeVersionIngredient" ("restaurantId", "recipeVersionId", "productId", "productName", "productUnit", "quantity")
SELECT ri."restaurantId", rv."id", ri."productId", p."name", p."unit", ri."quantity"
FROM "RecipeIngredient" ri
JOIN "RecipeVersion" rv ON rv."restaurantId" = ri."restaurantId" AND rv."recipeId" = ri."recipeId" AND rv."version" = 1
JOIN "Product" p ON p."restaurantId" = ri."restaurantId" AND p."id" = ri."productId";

ALTER TABLE "Production" ADD COLUMN "recipeVersionId" TEXT;
CREATE UNIQUE INDEX "Production_restaurantId_id_key" ON "Production"("restaurantId", "id");
CREATE INDEX "Production_restaurantId_recipeVersionId_idx" ON "Production"("restaurantId", "recipeVersionId");
ALTER TABLE "Production"
  ADD CONSTRAINT "Production_restaurantId_recipeVersionId_fkey"
    FOREIGN KEY ("restaurantId", "recipeVersionId") REFERENCES "RecipeVersion"("restaurantId", "id")
    ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
