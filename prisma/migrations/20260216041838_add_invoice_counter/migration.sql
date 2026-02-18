-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceCounter_userId_period_idx" ON "InvoiceCounter"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCounter_userId_period_key" ON "InvoiceCounter"("userId", "period");
