-- Allow SupportMessage.userId to be absent so an unauthenticated visitor's
-- conversation can be recorded without creating any User row for them.
-- Existing rows all already have a real userId, so this is a pure
-- loosening of the constraint — no data is touched or lost.
ALTER TABLE "SupportMessage" ALTER COLUMN "userId" DROP NOT NULL;

-- The guest-side conversation key — a server-generated, unguessable token
-- held in an httpOnly cookie (see middleware/supportIdentity.ts), never
-- supplied by the client and never tied to any account.
ALTER TABLE "SupportMessage" ADD COLUMN "guestId" TEXT;

CREATE INDEX "SupportMessage_guestId_createdAt_idx" ON "SupportMessage"("guestId", "createdAt");
