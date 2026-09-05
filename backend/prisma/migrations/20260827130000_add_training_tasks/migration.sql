-- CreateEnum
CREATE TYPE "TrainingTaskSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TrainingTask" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingTaskSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "submittedAnswer" TEXT NOT NULL,
    "isAutoMatch" BOOLEAN NOT NULL DEFAULT false,
    "productNameSnapshot" TEXT NOT NULL,
    "imageUrlSnapshot" TEXT NOT NULL,
    "status" "TrainingTaskSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingTaskSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingTask_isPublished_idx" ON "TrainingTask"("isPublished");

-- CreateIndex
CREATE INDEX "TrainingTaskSubmission_userId_idx" ON "TrainingTaskSubmission"("userId");

-- CreateIndex
CREATE INDEX "TrainingTaskSubmission_taskId_idx" ON "TrainingTaskSubmission"("taskId");

-- CreateIndex
CREATE INDEX "TrainingTaskSubmission_status_idx" ON "TrainingTaskSubmission"("status");

-- AddForeignKey
ALTER TABLE "TrainingTaskSubmission" ADD CONSTRAINT "TrainingTaskSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingTaskSubmission" ADD CONSTRAINT "TrainingTaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TrainingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingTaskSubmission" ADD CONSTRAINT "TrainingTaskSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
