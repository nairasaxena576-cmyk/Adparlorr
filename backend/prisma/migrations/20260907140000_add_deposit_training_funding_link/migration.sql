-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "trainingFundingReferralId" TEXT;

-- CreateIndex
CREATE INDEX "Deposit_trainingFundingReferralId_idx" ON "Deposit"("trainingFundingReferralId");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_trainingFundingReferralId_fkey" FOREIGN KEY ("trainingFundingReferralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
