/*
  Warnings:

  - Made the column `templateInvoiceId` on table `RecurringInvoice` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_templateInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_userId_fkey";

-- DropIndex
DROP INDEX "RecurringInvoice_clientId_idx";

-- DropIndex
DROP INDEX "RecurringInvoice_isActive_idx";

-- DropIndex
DROP INDEX "RecurringInvoice_nextRunAt_idx";

-- DropIndex
DROP INDEX "RecurringInvoice_templateInvoiceId_key";

-- DropIndex
DROP INDEX "RecurringInvoice_userId_idx";

-- AlterTable
ALTER TABLE "RecurringInvoice" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "templateInvoiceId" SET NOT NULL,
ALTER COLUMN "frequency" SET DEFAULT 'MONTHLY';

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_isActive_nextRunAt_idx" ON "RecurringInvoice"("userId", "isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_clientId_idx" ON "RecurringInvoice"("userId", "clientId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_templateInvoiceId_idx" ON "RecurringInvoice"("userId", "templateInvoiceId");

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_templateInvoiceId_fkey" FOREIGN KEY ("templateInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
