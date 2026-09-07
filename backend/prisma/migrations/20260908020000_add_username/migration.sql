-- Step 1: add the column nullable first — existing rows have no value yet
-- and the column cannot be NOT NULL/UNIQUE until every row is backfilled.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Step 2: deterministically backfill every existing user from the
-- local-part of their email (lowercased, restricted to a safe character
-- set), with a numeric "-N" suffix appended whenever two users would
-- otherwise derive the same candidate — never random, never exposes any
-- password, and always produces a valid, unique value.
WITH base AS (
  SELECT
    "id",
    "createdAt",
    NULLIF(
      lower(regexp_replace(left(split_part("email", '@', 1), 30), '[^a-z0-9_.-]', '', 'gi')),
      ''
    ) AS candidate
  FROM "User"
),
ranked AS (
  SELECT
    "id",
    COALESCE(candidate, 'user') AS candidate,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(candidate, 'user')
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM base
)
UPDATE "User" u
SET "username" = CASE WHEN ranked.rn = 1 THEN ranked.candidate ELSE ranked.candidate || '-' || (ranked.rn - 1) END
FROM ranked
WHERE u."id" = ranked."id";

-- Step 3: every row now has a value — safe to enforce NOT NULL + UNIQUE.
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
