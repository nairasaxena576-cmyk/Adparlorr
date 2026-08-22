import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin, createFixtureCourse } from './helpers';

function uniqueSlug() {
  return `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('training management (admin)', () => {
  it('lets an admin create a course (with an assessment shell created automatically)', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/training/courses')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'New Course', slug: uniqueSlug(), description: 'desc' });

    expect(res.status).toBe(201);
    expect(res.body.data.course.title).toBe('New Course');
    expect(res.body.data.course.assessment).toBeTruthy();
  });

  it('rejects creating a course with a duplicate slug', async () => {
    const admin = await createAdminAndLogin();
    const slug = uniqueSlug();
    await admin.agent
      .post('/api/admin/training/courses')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'First', slug });

    const res = await admin.agent
      .post('/api/admin/training/courses')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Second', slug });
    expect(res.status).toBe(409);
  });

  it('lets an admin edit a course', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();

    const res = await admin.agent
      .put(`/api/admin/training/courses/${course.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Renamed Course' });

    expect(res.status).toBe(200);
    expect(res.body.data.course.title).toBe('Renamed Course');
  });

  it('lets an admin create, edit, and delete a chapter', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();

    const createRes = await admin.agent
      .post(`/api/admin/training/courses/${course.id}/chapters`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'New Chapter', order: 2 });
    expect(createRes.status).toBe(201);
    const chapterId = createRes.body.data.chapter.id;

    const editRes = await admin.agent
      .put(`/api/admin/training/chapters/${chapterId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Renamed Chapter' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.chapter.title).toBe('Renamed Chapter');

    const deleteRes = await admin.agent
      .delete(`/api/admin/training/chapters/${chapterId}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(deleteRes.status).toBe(200);
  });

  it('lets an admin reorder chapters (move up/down swaps order with the sibling)', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();
    const chapter1Id = course.chapters[0].id;

    const secondRes = await admin.agent
      .post(`/api/admin/training/courses/${course.id}/chapters`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Chapter 2', order: 2 });
    const chapter2Id = secondRes.body.data.chapter.id;

    const reorderRes = await admin.agent
      .post(`/api/admin/training/chapters/${chapter2Id}/reorder`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ direction: 'up' });
    expect(reorderRes.status).toBe(200);

    const courseRes = await admin.agent.get(`/api/admin/training/courses/${course.id}`);
    const chapters = courseRes.body.data.course.chapters as { id: string; order: number }[];
    const c1 = chapters.find((c) => c.id === chapter1Id)!;
    const c2 = chapters.find((c) => c.id === chapter2Id)!;
    expect(c2.order).toBeLessThan(c1.order);
  });

  it('lets an admin create, edit, and delete a lesson', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();
    const chapterId = course.chapters[0].id;

    const createRes = await admin.agent
      .post(`/api/admin/training/chapters/${chapterId}/lessons`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'New Lesson', content: 'Lesson content', order: 3 });
    expect(createRes.status).toBe(201);
    const lessonId = createRes.body.data.lesson.id;

    const editRes = await admin.agent
      .put(`/api/admin/training/lessons/${lessonId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Renamed Lesson', content: 'Updated content' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.lesson.title).toBe('Renamed Lesson');

    const deleteRes = await admin.agent
      .delete(`/api/admin/training/lessons/${lessonId}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(deleteRes.status).toBe(200);
  });

  it('lets an admin publish and unpublish a course, chapter, and lesson', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse({ isPublished: false });
    const chapterId = course.chapters[0].id;
    const lessonId = course.chapters[0].lessons[0].id;

    const pubCourse = await admin.agent
      .put(`/api/admin/training/courses/${course.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isPublished: true });
    expect(pubCourse.body.data.course.isPublished).toBe(true);

    const unpubChapter = await admin.agent
      .put(`/api/admin/training/chapters/${chapterId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isPublished: false });
    expect(unpubChapter.body.data.chapter.isPublished).toBe(false);

    const unpubLesson = await admin.agent
      .put(`/api/admin/training/lessons/${lessonId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isPublished: false });
    expect(unpubLesson.body.data.lesson.isPublished).toBe(false);
  });

  it('lets an admin create, edit, reorder, and delete assessment questions', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();
    const assessmentId = course.assessment!.id;

    const createRes = await admin.agent
      .post(`/api/admin/training/assessments/${assessmentId}/questions`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        question: 'New question?',
        points: 2,
        order: 3,
        answers: [
          { answer: 'Right', isCorrect: true, order: 1 },
          { answer: 'Wrong', isCorrect: false, order: 2 },
        ],
      });
    expect(createRes.status).toBe(201);
    const questionId = createRes.body.data.question.id;

    const editRes = await admin.agent
      .put(`/api/admin/training/questions/${questionId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ question: 'Updated question?' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.question.question).toBe('Updated question?');

    const reorderRes = await admin.agent
      .post(`/api/admin/training/questions/${questionId}/reorder`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ direction: 'up' });
    expect(reorderRes.status).toBe(200);

    const deleteRes = await admin.agent
      .delete(`/api/admin/training/questions/${questionId}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(deleteRes.status).toBe(200);
  });

  it('rejects creating a question with fewer than two answers or no correct answer', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse();
    const assessmentId = course.assessment!.id;

    const tooFewAnswers = await admin.agent
      .post(`/api/admin/training/assessments/${assessmentId}/questions`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ question: 'Q?', points: 1, order: 1, answers: [{ answer: 'Only one', isCorrect: true, order: 1 }] });
    expect(tooFewAnswers.status).toBe(400);

    const noCorrectAnswer = await admin.agent
      .post(`/api/admin/training/assessments/${assessmentId}/questions`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        question: 'Q?',
        points: 1,
        order: 1,
        answers: [
          { answer: 'A', isCorrect: false, order: 1 },
          { answer: 'B', isCorrect: false, order: 2 },
        ],
      });
    expect(noCorrectAnswer.status).toBe(400);
  });

  it('rejects a non-admin from every training management endpoint', async () => {
    const course = await createFixtureCourse();
    const { agent, csrfToken } = await registerAndLogin();

    expect((await agent.get('/api/admin/training/courses')).status).toBe(403);
    expect(
      (
        await agent
          .post('/api/admin/training/courses')
          .set('X-CSRF-Token', csrfToken)
          .send({ title: 'X', slug: uniqueSlug() })
      ).status
    ).toBe(403);
    expect(
      (
        await agent
          .put(`/api/admin/training/courses/${course.id}`)
          .set('X-CSRF-Token', csrfToken)
          .send({ title: 'Hacked' })
      ).status
    ).toBe(403);
  });

  it('does not erase existing customer progress when admin edits lesson content, title, or order', async () => {
    const course = await createFixtureCourse();
    const lessonId = course.chapters[0].lessons[0].id;
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    await user.agent.post(`/api/training/lessons/${lessonId}/complete`).set('X-CSRF-Token', user.csrfToken);

    await admin.agent
      .put(`/api/admin/training/lessons/${lessonId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ title: 'Edited Title', content: 'Edited content', order: 5 });

    const res = await user.agent.get(`/api/training/courses/${course.id}`);
    // Look up by id rather than array index — the edit intentionally changed
    // this lesson's order, which changes its position in the sorted list.
    const lessons = res.body.data.course.chapters[0].lessons as { id: string; completed: boolean }[];
    const edited = lessons.find((l) => l.id === lessonId)!;
    expect(edited.completed).toBe(true);
  });

  it('explicit reset-progress action clears progress and re-locks deposits for a required course', async () => {
    const admin = await createAdminAndLogin();
    const course = await createFixtureCourse({ isRequired: true });
    const user = await registerAndLogin();
    const [q1, q2] = course.assessment!.questions;
    const correct1 = q1.answers.find((a) => a.isCorrect)!;
    const correct2 = q2.answers.find((a) => a.isCorrect)!;

    await user.agent
      .post(`/api/training/courses/${course.id}/assessment/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({
        answers: [
          { questionId: q1.id, answerId: correct1.id },
          { questionId: q2.id, answerId: correct2.id },
        ],
      });

    const meBefore = await user.agent.get('/api/auth/me');
    expect(meBefore.body.data.user.trainingCompletedAt).not.toBeNull();

    const resetRes = await admin.agent
      .post(`/api/admin/training/courses/${course.id}/reset-progress`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({});
    expect(resetRes.status).toBe(200);

    const meAfter = await user.agent.get('/api/auth/me');
    expect(meAfter.body.data.user.trainingCompletedAt).toBeNull();
  });
});
