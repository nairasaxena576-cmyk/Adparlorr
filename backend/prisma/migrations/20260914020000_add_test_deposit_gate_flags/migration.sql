-- AlterTable
ALTER TABLE "User" ADD COLUMN     "testBypassTrainingGate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testRequiresDepositForLastTask" BOOLEAN NOT NULL DEFAULT false;
