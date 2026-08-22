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
