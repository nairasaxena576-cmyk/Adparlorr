import { beforeAll, beforeEach, afterAll } from 'vitest';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { buildSyntheticProducts } from '../src/lib/productCatalog';
import { resetTaskCounter, resetProductCounter, resetCourseCounter, resetCounter } from './helpers';

// This suite truncates the database between every test. A prior incident:
// TEST_DATABASE_URL was set to a value that satisfied a naive `/test/i`
// check on the whole connection string while still resolving to the exact
// same database as production — every run silently wrote fixture data
// (including ~140 fake ADMIN accounts) into the live database. These
// checks are layered and fail closed: any layer that can't be positively
// verified refuses to run, rather than assuming safety.

function parseDbIdentity(rawUrl: string): { host: string; database: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Refusing to run tests: DATABASE_URL is not a parseable URL.');
  }
  return { host: parsed.hostname.toLowerCase(), database: parsed.pathname.replace(/^\//, '').toLowerCase() };
}

const testDb = parseDbIdentity(env.DATABASE_URL);

// Layer 1: the actual database NAME (not the whole connection string,
// which can carry decorative query params) must itself look like a
// dedicated test database.
if (!/(^|_)test$/i.test(testDb.database)) {
  throw new Error(
    `Refusing to run tests: resolved database name "${testDb.database}" does not end in "_test". ` +
      'A decorative "test" elsewhere in the connection string is not accepted.'
  );
}

// Layer 2: must not be the same physical database as the real app.
const rawAppUrl = process.env.APP_DATABASE_URL_FOR_SAFETY_CHECK;
if (rawAppUrl) {
  const appDb = parseDbIdentity(rawAppUrl);
  if (appDb.host === testDb.host && appDb.database === testDb.database) {
    throw new Error(
      'Refusing to run tests: the resolved test database is the exact same host+database as ' +
        'the real application DATABASE_URL.'
    );
  }
}

// Deposit rows RESTRICT deletion of the Transaction/CryptoAsset rows they
// reference, so they must be cleared before those tables — cascade from
// deleting User alone isn't enough to get the ordering right here.
async function clearPerTestData() {
  await prisma.deposit.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.taskSubmission.deleteMany();
  // Cascades away chapters/lessons/assessment/questions/answers/progress/completions.
  await prisma.trainingCourse.deleteMany();
  // Cascades away TrainingTaskSubmission rows.
  await prisma.trainingTask.deleteMany();
  await prisma.user.deleteMany();
  await prisma.supportSettings.deleteMany();
}

async function resetCryptoAssets() {
  await prisma.cryptoAsset.updateMany({ data: { isEnabled: false, address: null } });
}

async function resetDb() {
  await clearPerTestData();
  await prisma.product.deleteMany();
  await prisma.cryptoAsset.deleteMany();
}

async function seedTestProducts() {
  await prisma.product.createMany({ data: buildSyntheticProducts() });
}

async function seedTestCryptoAssets() {
  await prisma.cryptoAsset.createMany({
    data: [{ code: 'USDT' }, { code: 'BTC' }, { code: 'ETH' }],
  });
}

beforeAll(async () => {
  // Layer 3: live confirmation from Postgres itself, right before any
  // destructive call — immune to connection-string text tricks.
  const [{ current_database: liveDbName }] = await prisma.$queryRawUnsafe<{ current_database: string }[]>(
    'SELECT current_database()'
  );
  if (!/(^|_)test$/i.test(String(liveDbName).toLowerCase())) {
    throw new Error(
      `Refusing to run tests: connected Postgres reports current_database() = "${liveDbName}", ` +
        'which does not look like a dedicated test database. Aborting before any data is touched.'
    );
  }

  await resetDb();
  // productCounter must only reset when Product rows are actually cleared
  // (resetDb, above) — clearPerTestData() below does not touch Product, so
  // resetting this counter every test would regenerate a displayOrder that
  // collides with a still-present row from an earlier test in this file.
  resetProductCounter();
  await seedTestProducts();
  await seedTestCryptoAssets();
});

beforeEach(async () => {
  await clearPerTestData();
  await resetCryptoAssets();
  // Reset task/course/general counters to ensure consistent ordering across
  // tests — safe here because clearPerTestData() above does clear their
  // corresponding tables every time.
  resetTaskCounter();
  resetCourseCounter();
  resetCounter();
});

afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});
