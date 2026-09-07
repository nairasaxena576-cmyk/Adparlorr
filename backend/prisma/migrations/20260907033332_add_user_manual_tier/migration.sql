-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "manualTier" "Tier",
ADD COLUMN     "manualTierGrantedAt" TIMESTAMP(3);
