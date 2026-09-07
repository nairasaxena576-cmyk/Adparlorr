import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';

export const app = createApp();

export function extractCsrfToken(res: request.Response): string {
  const setCookie = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const csrfCookie = setCookie.find((c) => c.startsWith('adp_csrf='));
  if (!csrfCookie) throw new Error('CSRF cookie not found in response.');
  return decodeURIComponent(csrfCookie.split(';')[0].split('=')[1]);
}

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}`;
}
function uniqueEmail(): string {
  return `user${uniqueSuffix()}@example.test`;
}
// Must satisfy the real registration format (usernameSchema in
// auth.schema.ts: lowercase letters/digits/underscore/hyphen only) —
// "user<digits>_<digits>" already does, no extra sanitizing needed.
function uniqueUsername(): string {
  return `user${uniqueSuffix()}`;
}

interface RegisterOverrides {
  fullName?: string;
  username?: string;
  email?: string;
  password?: string;
  referralCode?: string;
}

export async function registerAndLogin(overrides: RegisterOverrides = {}) {
  const agent = request.agent(app);
  const username = overrides.username ?? uniqueUsername();
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? 'password123';

  const res = await agent.post('/api/auth/register').send({
    fullName: overrides.fullName ?? 'Test User',
    username,
    email,
    password,
    ...(overrides.referralCode ? { referralCode: overrides.referralCode } : {}),
  });

  const csrfToken = extractCsrfToken(res);
  return { agent, csrfToken, username, email, password, body: res.body };
}

export async function createAdminAndLogin() {
  const agent = request.agent(app);
  const username = uniqueUsername();
  const email = uniqueEmail();
  const password = 'adminPass123';
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      fullName: 'Admin Test',
      username,
      email,
      passwordHash,
      role: 'ADMIN',
      referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    },
  });

  const res = await agent.post('/api/auth/login').send({ username, password });
  const csrfToken = extractCsrfToken(res);
  return { agent, csrfToken, username, email };
}

let courseCounter = 0;

/**
 * Directly-seeded (bypassing the API) published course fixture: 1 chapter,
 * 2 published lessons, and a 2-question assessment with passingScore=100
 * (all-correct required to pass — makes pass/fail deterministic in tests).
 */
export async function createFixtureCourse(overrides: { isRequired?: boolean; isPublished?: boolean } = {}) {
  courseCounter += 1;
  const slug = `fixture-course-${Date.now()}-${courseCounter}`;

  return prisma.trainingCourse.create({
    data: {
      title: 'Fixture Course',
      slug,
      isPublished: overrides.isPublished ?? true,
      isRequired: overrides.isRequired ?? true,
      order: 1,
      chapters: {
        create: [
          {
            title: 'Chapter 1',
            order: 1,
            isPublished: true,
            lessons: {
              create: [
                { title: 'Lesson 1', content: 'Content 1', order: 1, isPublished: true },
                { title: 'Lesson 2', content: 'Content 2', order: 2, isPublished: true },
              ],
            },
          },
        ],
      },
      assessment: {
        create: {
          title: 'Fixture Assessment',
          passingScore: 100,
          isPublished: true,
          questions: {
            create: [
              {
                question: 'Q1?',
                points: 1,
                order: 1,
                answers: {
                  create: [
                    { answer: 'Correct 1', isCorrect: true, order: 1 },
                    { answer: 'Wrong 1', isCorrect: false, order: 2 },
                  ],
                },
              },
              {
                question: 'Q2?',
                points: 1,
                order: 2,
                answers: {
                  create: [
                    { answer: 'Correct 2', isCorrect: true, order: 1 },
                    { answer: 'Wrong 2', isCorrect: false, order: 2 },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: {
      chapters: { include: { lessons: true } },
      assessment: { include: { questions: { include: { answers: true } } } },
    },
  });
}

let taskCounter = 0;

/**
 * Directly-seeded (bypassing the API) published+required TrainingTask
 * fixture, with a deterministic productName so tests can submit a known
 * correct/incorrect answer.
 */
export async function createFixtureTask(
  overrides: {
    isPublished?: boolean;
    isRequired?: boolean;
    order?: number;
    productName?: string;
    imageUrl?: string;
  } = {}
) {
  taskCounter += 1;
  return prisma.trainingTask.create({
    data: {
      productName: overrides.productName ?? `Fixture Product ${taskCounter}`,
      imageUrl: overrides.imageUrl ?? `https://example.test/fixture-product-${taskCounter}.jpg`,
      instruction: 'Look at the image and enter the product name.',
      isPublished: overrides.isPublished ?? true,
      isRequired: overrides.isRequired ?? true,
      order: overrides.order ?? taskCounter,
    },
  });
}

export function resetTaskCounter() {
  taskCounter = 0;
}

export function resetProductCounter() {
  productCounter = 0;
}

export function resetCourseCounter() {
  courseCounter = 0;
}

export function resetCounter() {
  counter = 0;
}

let productCounter = 0;

/**
 * Directly-seeded (bypassing the API) Orders Product fixture. displayOrder
 * defaults to 900+n — well clear of the 45 synthetic products setup.ts
 * seeds at displayOrder 1..45, so fixtures never collide with the catalog
 * or each other under the displayOrder unique constraint.
 */
export async function createFixtureProduct(
  overrides: {
    name?: string;
    category?: string;
    reward?: number;
    cost?: number;
    // Defaults to $100 — matches the exact figure used throughout the
    // workbench commission examples (1% -> $1, 10% -> $10), and must stay
    // > 0 by default since the customer workbench excludes price=0
    // products (see product.repository.ts's listWorkbenchProducts).
    price?: number;
    // Which tier's workbench band this product belongs to. Defaults to
    // undefined (= untagged = Bronze, per schema.prisma's doc comment) —
    // only pass this to build a Silver/Gold/Platinum fixture set.
    tierEligibility?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    imageUrl?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  } = {}
) {
  productCounter += 1;
  return prisma.product.create({
    data: {
      name: overrides.name ?? `Fixture Product ${productCounter}`,
      category: overrides.category ?? 'Fixture',
      reward: overrides.reward ?? 1,
      cost: overrides.cost ?? 0.3,
      price: overrides.price ?? 100,
      tierEligibility: overrides.tierEligibility,
      imageUrl: overrides.imageUrl ?? null,
      isActive: overrides.isActive ?? true,
      displayOrder: overrides.displayOrder ?? 900 + productCounter,
    },
  });
}

/**
 * Completes the current authoritative training-completion workflow:
 * 1. Satisfies the training-access gate (referral verified against a Gold+
 *    referrer, then admin-confirmed funding — see unlockTrainingForCustomer).
 * 2. Creates/publishes required training tasks (default: 2 tasks).
 * 3. Submits each task — customer training submissions are auto-approved
 *    immediately (no separate admin approval step exists anymore).
 * 4. Allows the existing trainingTaskCompletion service to set User.trainingCompletedAt.
 *
 * Does NOT call deprecated evaluateAndSetTrainingCompletion().
 * Reusable across tests that need training completion as a precondition
 * (e.g. deposit/order tests) without caring about the training mechanics
 * themselves.
 */
export async function completeTrainingTasks(user: Session, taskCount = 2) {
  await unlockTrainingForCustomer(user);

  // Create required training tasks
  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    const task = await createFixtureTask({
      order: i + 1,
      productName: `Fixture Product ${i + 1}`,
      isPublished: true,
      isRequired: true,
    });
    tasks.push(task);
  }

  // Submit each task — auto-approved immediately, no admin review step.
  for (const task of tasks) {
    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: task.productName });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('APPROVED');
  }
}

/**
 * Creates `count` eligible (active, priced) fixture products in ascending
 * displayOrder, optionally tagged for one tier's workbench band — the
 * minimum needed to make that band "ready" (see SIMULATION_*_ORDER_BAND,
 * shrunk for tests in vitest.config.ts).
 */
export async function createFixtureWorkbenchSet(
  count: number,
  priceEach = 100,
  tierEligibility?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
) {
  const products = [];
  for (let i = 0; i < count; i += 1) {
    products.push(await createFixtureProduct({ price: priceEach, tierEligibility }));
  }
  return products;
}

/**
 * Satisfies the training-access gate (referral verified against a Gold+
 * referrer, then admin-confirmed funding — see referral.service.ts /
 * trainingTask.service.ts's assertTrainingUnlocked) for an already-
 * registered customer Session, so tests can reach the 45-task flow without
 * re-deriving this setup at every call site. Creates its own dedicated
 * referrer (Gold tier, funded balance) — never reuses one across calls.
 */
export async function unlockTrainingForCustomer(customer: Session) {
  const referrer = await registerAndLogin();
  await prisma.user.update({
    where: { id: referrer.body.data.user.id },
    data: { completedOrders: 200, totalDeposits: 2000, balance: 1500 },
  });

  const verifyRes = await customer.agent
    .post('/api/referrals/training/verify')
    .set('X-CSRF-Token', customer.csrfToken)
    .send({ referralCode: referrer.body.data.user.referralCode });
  if (verifyRes.status !== 200) {
    throw new Error(`unlockTrainingForCustomer: referral verification failed (${verifyRes.status}): ${JSON.stringify(verifyRes.body)}`);
  }

  const admin = await createAdminAndLogin();
  const confirmRes = await admin.agent
    .post(`/api/admin/referrals/${verifyRes.body.data.referral.referralId}/confirm-funding`)
    .set('X-CSRF-Token', admin.csrfToken);
  if (confirmRes.status !== 200) {
    throw new Error(`unlockTrainingForCustomer: funding confirmation failed (${confirmRes.status}): ${JSON.stringify(confirmRes.body)}`);
  }

  return { referrer, admin };
}
