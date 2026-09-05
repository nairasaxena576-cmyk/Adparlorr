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
function uniqueEmail(): string {
  counter += 1;
  return `user${Date.now()}_${counter}@example.test`;
}

interface RegisterOverrides {
  fullName?: string;
  email?: string;
  password?: string;
  referralCode?: string;
}

export async function registerAndLogin(overrides: RegisterOverrides = {}) {
  const agent = request.agent(app);
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? 'password123';

  const res = await agent.post('/api/auth/register').send({
    fullName: overrides.fullName ?? 'Test User',
    email,
    password,
    ...(overrides.referralCode ? { referralCode: overrides.referralCode } : {}),
  });

  const csrfToken = extractCsrfToken(res);
  return { agent, csrfToken, email, password, body: res.body };
}

export async function createAdminAndLogin() {
  const agent = request.agent(app);
  const email = uniqueEmail();
  const password = 'adminPass123';
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      fullName: 'Admin Test',
      email,
      passwordHash,
      role: 'ADMIN',
      referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    },
  });

  const res = await agent.post('/api/auth/login').send({ email, password });
  const csrfToken = extractCsrfToken(res);
  return { agent, csrfToken, email };
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
      imageUrl: overrides.imageUrl ?? null,
      isActive: overrides.isActive ?? true,
      displayOrder: overrides.displayOrder ?? 900 + productCounter,
    },
  });
}

/**
 * Completes the current authoritative training-completion workflow:
 * 1. Creates/publishes required training tasks (default: 2 tasks)
 * 2. Submits valid training-task submissions for each task
 * 3. Performs admin approval for each submission
 * 4. Allows the existing trainingTaskCompletion service to set User.trainingCompletedAt
 *
 * Does NOT call deprecated evaluateAndSetTrainingCompletion().
 * Reusable across tests that need training completion as a precondition.
 */
export async function completeTrainingTasks(user: Session, taskCount = 2) {
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

  // Get admin for approvals
  const admin = await createAdminAndLogin();

  // Submit and get approval for each task
  for (const task of tasks) {
    // Submit correct answer
    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: task.productName });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('PENDING');

    // Admin approves the submission
    const approveRes = await admin.agent
      .post(`/api/admin/training/submissions/${submitRes.body.data.submissionId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.submission.status).toBe('APPROVED');
  }
}

/**
 * Creates `count` eligible (active, priced) fixture products in ascending
 * displayOrder — the minimum needed to make the workbench "ready" (see
 * SIMULATION_WORKBENCH_SET_SIZE, overridden to 5 in vitest.config.ts).
 */
export async function createFixtureWorkbenchSet(count: number, priceEach = 100) {
  const products = [];
  for (let i = 0; i < count; i += 1) {
    products.push(await createFixtureProduct({ price: priceEach }));
  }
  return products;
}
