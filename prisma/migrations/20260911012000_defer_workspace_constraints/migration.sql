-- Check cross-links after the entire account/restaurant cascade completes.
ALTER TABLE "Product" ALTER CONSTRAINT "Product_restaurantId_supplierId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "RecipeIngredient" ALTER CONSTRAINT "RecipeIngredient_restaurantId_productId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "StockMovement" ALTER CONSTRAINT "StockMovement_restaurantId_productId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Production" ALTER CONSTRAINT "Production_restaurantId_recipeId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Prediction" ALTER CONSTRAINT "Prediction_restaurantId_productId_fkey" DEFERRABLE INITIALLY DEFERRED;
