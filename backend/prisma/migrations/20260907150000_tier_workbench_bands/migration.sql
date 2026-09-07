-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mergedMilestonesReached" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tierEligibility" "Tier";

-- CreateIndex
CREATE INDEX "Product_tierEligibility_idx" ON "Product"("tierEligibility");
