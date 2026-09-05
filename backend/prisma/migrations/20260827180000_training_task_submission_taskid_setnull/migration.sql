-- DropForeignKey
ALTER TABLE "TrainingTaskSubmission" DROP CONSTRAINT "TrainingTaskSubmission_taskId_fkey";

-- AlterTable
ALTER TABLE "TrainingTaskSubmission" ALTER COLUMN "taskId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TrainingTaskSubmission" ADD CONSTRAINT "TrainingTaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrainingTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
