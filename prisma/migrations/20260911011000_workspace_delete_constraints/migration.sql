-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_restaurantId_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_restaurantId_productId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_restaurantId_productId_fkey";

-- DropForeignKey
ALTER TABLE "Production" DROP CONSTRAINT "Production_restaurantId_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_restaurantId_productId_fkey";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_supplierId_fkey" FOREIGN KEY ("restaurantId", "supplierId") REFERENCES "Supplier"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_restaurantId_productId_fkey" FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_restaurantId_productId_fkey" FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Production" ADD CONSTRAINT "Production_restaurantId_recipeId_fkey" FOREIGN KEY ("restaurantId", "recipeId") REFERENCES "Recipe"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_restaurantId_productId_fkey" FOREIGN KEY ("restaurantId", "productId") REFERENCES "Product"("restaurantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

