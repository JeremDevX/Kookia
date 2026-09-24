CREATE TYPE "ServiceDayStatus" AS ENUM ('open', 'closed');
CREATE TYPE "ServiceDayCoverage" AS ENUM ('complete', 'partial', 'missing');

CREATE TABLE "ServiceDay" (
    "restaurantId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "status" "ServiceDayStatus" NOT NULL,
    "coverage" "ServiceDayCoverage" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDay_pkey" PRIMARY KEY ("restaurantId", "serviceDate")
);

INSERT INTO "ServiceDay" ("restaurantId", "serviceDate", "status", "coverage", "revision", "actorId", "createdAt", "updatedAt")
SELECT "restaurantId", "serviceDate", 'open', 'partial', 0, 'migration:daily-sale-backfill', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "DailySale"
GROUP BY "restaurantId", "serviceDate";

ALTER TABLE "ServiceDay"
ADD CONSTRAINT "ServiceDay_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "DailySale"
ADD CONSTRAINT "DailySale_restaurantId_serviceDate_fkey"
FOREIGN KEY ("restaurantId", "serviceDate") REFERENCES "ServiceDay"("restaurantId", "serviceDate") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
