-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "trainingFundingRequired" DECIMAL(12,2),
ADD COLUMN     "trainingFundedAt" TIMESTAMP(3),
ADD COLUMN     "trainingFundingTxId" TEXT;
