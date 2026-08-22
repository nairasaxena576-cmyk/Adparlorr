import { findUserById, updateUser } from '../repositories/user.repository';
import { listRequiredPublishedCourses } from '../repositories/trainingCourse.repository';
import { listProgressForUser } from '../repositories/trainingProgress.repository';
import { AppError } from '../utils/AppError';
import { toSafeUser, type SafeUser } from './auth.service';

/**
 * The single place that is allowed to set User.trainingCompletedAt — the
 * source of truth the deposit gate checks. Never settable directly by a
 * client request; only called as a side effect of the backend scoring a
 * passed assessment (see trainingAssessment.service.ts submitAssessment).
 *
 * A user is "training complete" once every published + required course has
 * a passed UserTrainingProgress row for them. With only one required course
 * (SMC) today, this reduces to "has SMC been passed" — but stays correct if
 * more required courses are added later.
 */
export async function evaluateAndSetTrainingCompletion(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  if (user.trainingCompletedAt) {
    return toSafeUser(user);
  }

  const requiredCourses = await listRequiredPublishedCourses();
  if (requiredCourses.length === 0) {
    return toSafeUser(user);
  }

  const progressRows = await listProgressForUser(
    userId,
    requiredCourses.map((c) => c.id)
  );
  const passedCourseIds = new Set(progressRows.filter((p) => p.passed).map((p) => p.courseId));
  const allRequiredPassed = requiredCourses.every((c) => passedCourseIds.has(c.id));

  if (!allRequiredPassed) {
    return toSafeUser(user);
  }

  const updated = await updateUser(userId, { trainingCompletedAt: new Date() });
  return toSafeUser(updated);
}
