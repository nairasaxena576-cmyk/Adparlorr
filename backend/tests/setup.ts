import { beforeAll, beforeEach, afterAll } from 'vitest';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { buildSyntheticProducts } from '../src/lib/productCatalog';

// This suite truncates the database between every test. Refuse to run
// unless DATABASE_URL clearly points at a disposable test database —
// pointing it at a shared dev/prod database would silently wipe real data.
if (!/test/i.test(env.DATABASE_URL)) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL does not look like a test database ' +
      '(expected the database name to contain "test"). Point DATABASE_URL at a ' +
      'disposable test database before running the test suite.'
  );
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
  await resetDb();
  await seedTestProducts();
  await seedTestCryptoAssets();
});

beforeEach(async () => {
  await clearPerTestData();
  await resetCryptoAssets();
});

afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});
