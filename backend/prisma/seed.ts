import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildSyntheticProducts } from '../src/lib/productCatalog';
import { SMC_COURSE, SMC_CHAPTERS, SMC_QUESTIONS } from './seedData/smcCourse';

const prisma = new PrismaClient();

async function seedProducts() {
  const products = buildSyntheticProducts();
  for (const product of products) {
    await prisma.product.upsert({
      where: { displayOrder: product.displayOrder },
      update: {
        name: product.name,
        category: product.category,
        reward: product.reward,
        cost: product.cost,
        isActive: true,
      },
      create: product,
    });
  }
  console.log(`Seeded ${products.length} training-simulation products.`);
}

async function seedCryptoAssets() {
  const codes = ['USDT', 'BTC', 'ETH'] as const;
  for (const code of codes) {
    await prisma.cryptoAsset.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }
  console.log(`Seeded ${codes.length} crypto asset config rows (disabled, no address, until an admin configures them).`);
}

// Deliberately NOT one interactive transaction (`prisma.$transaction(async (tx) => ...)`)
// wrapping ~50 sequential awaited writes: against a remote, connection-pooled
// Postgres (Supabase PgBouncer/Supavisor in transaction-pooling mode), that many
// discrete round-trips inside a single interactive transaction can outlive
// Prisma's interactive-transaction lifetime and/or the pooler can recycle the
// underlying connection between round-trips, producing P2028 ("Transaction not
// found... old closed transaction"). Instead: every write below is either a
// single `create` or a batched `createMany` — each is one atomic round-trip on
// its own, which is exactly what a transaction-mode pooler handles reliably, so
// there is no long-lived multi-statement transaction to lose.
//
// This is also recovery-aware rather than a blind "exists? skip" check: a run
// that died partway through (e.g. the previous P2028) can leave the course row
// and some chapters/lessons/questions in place without the rest. Every level is
// re-checked against what's actually in the DB and only the missing pieces are
// inserted — nothing is ever updated or deleted, so admin edits made after a
// successful seed are never touched.
async function seedSmcCourse() {
  let course = await prisma.trainingCourse.findUnique({ where: { slug: SMC_COURSE.slug } });

  if (!course) {
    course = await prisma.trainingCourse.create({
      data: {
        id: randomUUID(),
        title: SMC_COURSE.title,
        slug: SMC_COURSE.slug,
        description: SMC_COURSE.description,
        isPublished: SMC_COURSE.isPublished,
        isRequired: SMC_COURSE.isRequired,
        order: SMC_COURSE.order,
      },
    });
    console.log(`Created course "${SMC_COURSE.slug}".`);
  } else {
    console.log(`Course "${SMC_COURSE.slug}" already exists — checking for missing content to complete a possibly partial seed.`);
  }

  // --- Chapters: fill in any of the 10 that are missing, matched by title within this course. ---
  const existingChapters = await prisma.trainingChapter.findMany({ where: { courseId: course.id } });
  const chapterIdByTitle = new Map(existingChapters.map((c) => [c.title, c.id]));

  const chaptersToCreate = SMC_CHAPTERS.filter((ch) => !chapterIdByTitle.has(ch.title)).map((ch) => ({
    id: randomUUID(),
    courseId: course!.id,
    title: ch.title,
    description: ch.description,
    order: ch.order,
    isPublished: true,
  }));

  if (chaptersToCreate.length > 0) {
    await prisma.trainingChapter.createMany({ data: chaptersToCreate });
    for (const ch of chaptersToCreate) chapterIdByTitle.set(ch.title, ch.id);
    console.log(`Created ${chaptersToCreate.length} chapter(s).`);
  }

  // --- Lessons: fill in any of the 28 that are missing, matched by (chapter, title). ---
  const chapterIds = [...chapterIdByTitle.values()];
  const existingLessons = await prisma.trainingLesson.findMany({
    where: { chapterId: { in: chapterIds } },
    select: { chapterId: true, title: true },
  });
  const existingLessonKeys = new Set(existingLessons.map((l) => `${l.chapterId}::${l.title}`));

  const lessonsToCreate: {
    id: string;
    chapterId: string;
    title: string;
    content: string;
    order: number;
    isPublished: boolean;
  }[] = [];

  for (const chapter of SMC_CHAPTERS) {
    const chapterId = chapterIdByTitle.get(chapter.title)!;
    for (const lesson of chapter.lessons) {
      const key = `${chapterId}::${lesson.title}`;
      if (existingLessonKeys.has(key)) continue;
      lessonsToCreate.push({
        id: randomUUID(),
        chapterId,
        title: lesson.title,
        content: lesson.content,
        order: lesson.order,
        isPublished: true,
      });
    }
  }

  if (lessonsToCreate.length > 0) {
    await prisma.trainingLesson.createMany({ data: lessonsToCreate });
    console.log(`Created ${lessonsToCreate.length} lesson(s).`);
  }

  // --- Assessment: single row, unique per course. ---
  let assessment = await prisma.trainingAssessment.findUnique({ where: { courseId: course.id } });
  if (!assessment) {
    assessment = await prisma.trainingAssessment.create({
      data: {
        id: randomUUID(),
        courseId: course.id,
        title: SMC_COURSE.assessment.title,
        passingScore: SMC_COURSE.assessment.passingScore,
        isPublished: SMC_COURSE.assessment.isPublished,
      },
    });
    console.log('Created assessment.');
  }

  // --- Questions: fill in any of the 10 that are missing, matched by question text. ---
  const existingQuestions = await prisma.trainingQuestion.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, question: true },
  });
  const questionIdByText = new Map(existingQuestions.map((q) => [q.question, q.id]));

  const questionsToCreate = SMC_QUESTIONS.filter((q) => !questionIdByText.has(q.question)).map((q) => ({
    id: randomUUID(),
    assessmentId: assessment!.id,
    question: q.question,
    points: q.points,
    order: q.order,
  }));

  if (questionsToCreate.length > 0) {
    await prisma.trainingQuestion.createMany({ data: questionsToCreate });
    for (const q of questionsToCreate) questionIdByText.set(q.question, q.id);
    console.log(`Created ${questionsToCreate.length} question(s).`);
  }

  // --- Answers: always backfill for questions just created above. For questions that
  // already existed (from a prior run), only backfill if they have zero answers — a
  // real admin-managed question always has >=2 answers (enforced by the admin API's own
  // validation), so zero answers can only mean a prior seed died between creating the
  // question and creating its answers. Never touch a question that already has answers.
  const questionIdsToCheck = [...questionIdByText.values()];
  const answerCounts = await prisma.trainingAnswer.groupBy({
    by: ['questionId'],
    where: { questionId: { in: questionIdsToCheck } },
    _count: { questionId: true },
  });
  const hasAnswers = new Set(answerCounts.filter((a) => a._count.questionId > 0).map((a) => a.questionId));

  const answersToCreate: { id: string; questionId: string; answer: string; isCorrect: boolean; order: number }[] = [];
  for (const q of SMC_QUESTIONS) {
    const questionId = questionIdByText.get(q.question)!;
    if (hasAnswers.has(questionId)) continue;
    for (const a of q.answers) {
      answersToCreate.push({
        id: randomUUID(),
        questionId,
        answer: a.answer,
        isCorrect: a.isCorrect,
        order: a.order,
      });
    }
  }

  if (answersToCreate.length > 0) {
    await prisma.trainingAnswer.createMany({ data: answersToCreate });
    console.log(`Created ${answersToCreate.length} answer(s).`);
  }

  const totalLessons = SMC_CHAPTERS.reduce((sum, c) => sum + c.lessons.length, 0);
  console.log(
    `SMC course "${SMC_COURSE.title}" is now complete: ${SMC_CHAPTERS.length} chapters, ${totalLessons} lessons, ${SMC_QUESTIONS.length} assessment questions.`
  );
}

// Same deterministic derivation as the username-backfill migration
// (20260908020000_add_username): the email local-part, sanitized to the
// same character set the registration form now enforces, with a numeric
// suffix appended only if that candidate happens to already be taken.
async function deriveUniqueUsername(email: string): Promise<string> {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30) || 'admin';
  let candidate = base;
  let suffix = 0;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.log('ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set — skipping admin bootstrap.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`Admin account for ${email} already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const username = await deriveUniqueUsername(email);

  await prisma.user.create({
    data: {
      fullName: 'Training Administrator',
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      referralCode,
    },
  });
  console.log(`Seeded admin account for ${email} (username: ${username}).`);
}

async function main() {
  await seedProducts();
  await seedCryptoAssets();
  await seedSmcCourse();
  await seedAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
