-- Annonce pack purchases through Chargily Pay.
--
-- The row is written before the customer reaches the checkout, holding the
-- price the server chose, so the client never supplies an amount.

CREATE TYPE "PackOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');

CREATE TABLE "PackOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "buyerId" TEXT,
    "packId" TEXT NOT NULL,
    "jobs" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'dzd',
    "status" "PackOrderStatus" NOT NULL DEFAULT 'PENDING',
    "checkoutId" TEXT,
    "checkoutUrl" TEXT,
    "invoiceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackOrder_pkey" PRIMARY KEY ("id")
);

-- checkoutId unique: a webhook replayed by Chargily (or by anyone who got hold
-- of one) must not be able to grant the same annonces twice.
CREATE UNIQUE INDEX "PackOrder_checkoutId_key" ON "PackOrder"("checkoutId");
CREATE UNIQUE INDEX "PackOrder_invoiceNumber_key" ON "PackOrder"("invoiceNumber");
CREATE INDEX "PackOrder_companyId_idx" ON "PackOrder"("companyId");
CREATE INDEX "PackOrder_status_idx" ON "PackOrder"("status");

ALTER TABLE "PackOrder" ADD CONSTRAINT "PackOrder_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The buyer may leave; the purchase record must survive them.
ALTER TABLE "PackOrder" ADD CONSTRAINT "PackOrder_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
