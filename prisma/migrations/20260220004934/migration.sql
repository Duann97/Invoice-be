-- AlterTable
ALTER TABLE "RecurringInvoice" ADD COLUMN     "maxOccurrences" INTEGER,
ALTER COLUMN "frequency" DROP DEFAULT;
