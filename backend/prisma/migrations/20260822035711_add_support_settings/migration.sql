-- CreateTable
CREATE TABLE "SupportSettings" (
    "id" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSettings_pkey" PRIMARY KEY ("id")
);
