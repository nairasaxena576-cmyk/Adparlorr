import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin, createFixtureCourse } from './helpers';
import { prisma } from '../src/lib/prisma';

describe('training catalog (customer)', () => {
  it('lists published training courses', async () => {
    const course = await createFixtureCourse();
    const { agent } = await registerAndLogin();

    const res = await agent.get('/api/training/courses');
    expect(res.status).toBe(200);
    const ids = res.body.data.courses.map((c: { id: string }) => c.id);
    expect(ids).toContain(course.id);
  });

  it('does not show an unpublished course', async () => {
    const course = await createFixtureCourse({ isPublished: false });
    const { agent } = await registerAndLogin();

    const listRes = await agent.get('/api/training/courses');
    const ids = listRes.body.data.courses.map((c: { id: string }) => c.id);
    expect(ids).not.toContain(course.id);

    const detailRes = await agent.get(`/api/training/courses/${course.id}`);
    expect(detailRes.status).toBe(404);
  });

  it('does not expose an unpublished lesson', async () => {
    const course = await createFixtureCourse();
    const chapterId = course.chapters[0].id;
    const hiddenLesson = await prisma.trainingLesson.create({
      data: { chapterId, title: 'Hidden', content: 'secret', order: 99, isPublished: false },
    });

    const { agent } = await registerAndLogin();

    const detailRes = await agent.get(`/api/training/courses/${course.id}`);
    const lessonIds = detailRes.body.data.course.chapters.flatMap(
      (ch: { lessons: { id: string }[] }) => ch.lessons.map((l) => l.id)
    );
    expect(lessonIds).not.toContain(hiddenLesson.id);

    const lessonRes = await agent.get(`/api/training/lessons/${hiddenLesson.id}`);
    expect(lessonRes.status).toBe(404);
  });

  it("returns the current user's own progress on the course detail response", async () => {
    const course = await createFixtureCourse();
    const lessonId = course.chapters[0].lessons[0].id;
    const { agent, csrfToken } = await registerAndLogin();

    await agent.post(`/api/training/lessons/${lessonId}/complete`).set('X-CSRF-Token', csrfToken);

    const res = await agent.get(`/api/training/courses/${course.id}`);
    expect(res.body.data.course.completedLessons).toBe(1);
    expect(res.body.data.course.chapters[0].lessons[0].completed).toBe(true);
    expect(res.body.data.course.chapters[0].lessons[1].completed).toBe(false);
  });

  it("does not leak another user's progress", async () => {
    const course = await createFixtureCourse();
    const lessonId = course.chapters[0].lessons[0].id;
    const userA = await registerAndLogin();
    const userB = await registerAndLogin();

    await userA.agent.post(`/api/training/lessons/${lessonId}/complete`).set('X-CSRF-Token', userA.csrfToken);

    const resB = await userB.agent.get(`/api/training/courses/${course.id}`);
    expect(resB.body.data.course.completedLessons).toBe(0);
    expect(resB.body.data.course.chapters[0].lessons[0].completed).toBe(false);
  });

  it('lets a customer complete an eligible (published) lesson', async () => {
    const course = await createFixtureCourse();
    const lessonId = course.chapters[0].lessons[0].id;
    const { agent, csrfToken } = await registerAndLogin();

    const res = await agent.post(`/api/training/lessons/${lessonId}/complete`).set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(true);
  });

  it('rejects marking an inaccessible (unpublished) lesson as complete', async () => {
    const course = await createFixtureCourse();
    const chapterId = course.chapters[0].id;
    const hiddenLesson = await prisma.trainingLesson.create({
      data: { chapterId, title: 'Hidden', content: 'secret', order: 99, isPublished: false },
    });
    const { agent, csrfToken } = await registerAndLogin();

    const res = await agent
      .post(`/api/training/lessons/${hiddenLesson.id}/complete`)
      .set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('requires authentication for every customer training endpoint', async () => {
    const course = await createFixtureCourse();

    expect((await request(app).get('/api/training/courses')).status).toBe(401);
    expect((await request(app).get(`/api/training/courses/${course.id}`)).status).toBe(401);
  });
});
