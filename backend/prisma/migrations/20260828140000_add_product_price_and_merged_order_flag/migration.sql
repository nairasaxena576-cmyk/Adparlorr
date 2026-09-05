-- AlterTable
ALTER TABLE "Product" ADD COLUMN "price" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TaskSubmission" ADD COLUMN "isMergedOrder" BOOLEAN NOT NULL DEFAULT false;
