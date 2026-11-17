import { Prisma, type StockCount } from "@prisma/client";

export function listLatestStockCounts(db: Prisma.TransactionClient, restaurantId: string) {
  return db.$queryRaw<StockCount[]>(Prisma.sql`
    SELECT latest.*
    FROM "Product" AS product
    CROSS JOIN LATERAL (
      SELECT stock_count.*
      FROM "StockCount" AS stock_count
      WHERE stock_count."restaurantId" = product."restaurantId" AND stock_count."productId" = product.id
      ORDER BY stock_count."countedAt" DESC, stock_count.id DESC
      LIMIT 1
    ) AS latest
    WHERE product."restaurantId" = ${restaurantId}
  `);
}
