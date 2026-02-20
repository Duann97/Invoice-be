/*
  Warnings:

  - You are about to drop the column `lastRunAt` on the `RecurringInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `maxOccurrences` on the `RecurringInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `occurrenceCount` on the `RecurringInvoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[templateInvoiceId]` on the table `RecurringInvoice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_templateInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringInvoice" DROP CONSTRAINT "RecurringInvoice_userId_fkey";

-- DropIndex
DROP INDEX "RecurringInvoice_userId_clientId_idx";

-- DropIndex
DROP INDEX "RecurringInvoice_userId_isActive_nextRunAt_idx";

-- DropIndex
DROP INDEX "RecurringInvoice_userId_templateInvoiceId_idx";

-- AlterTable
ALTER TABLE "RecurringInvoice" DROP COLUMN "lastRunAt",
DROP COLUMN "maxOccurrences",
DROP COLUMN "occurrenceCount",
ALTER COLUMN "templateInvoiceId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoice_templateInvoiceId_key" ON "RecurringInvoice"("templateInvoiceId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_userId_idx" ON "RecurringInvoice"("userId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_clientId_idx" ON "RecurringInvoice"("clientId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextRunAt_idx" ON "RecurringInvoice"("nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringInvoice_isActive_idx" ON "RecurringInvoice"("isActive");

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_templateInvoiceId_fkey" FOREIGN KEY ("templateInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
