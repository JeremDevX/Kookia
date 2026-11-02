CREATE TABLE "Membership" (
  "userId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('chef', 'kitchen')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Membership_restaurantId_idx" ON "Membership"("restaurantId");
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "role" TEXT NOT NULL CHECK ("role" IN ('chef', 'kitchen')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invitation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_restaurantId_idx" ON "Invitation"("restaurantId");
