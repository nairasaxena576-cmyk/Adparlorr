import { findUserById, updateUser } from '../repositories/user.repository';
import { listRequiredPublishedCourses } from '../repositories/trainingCourse.repository';
import { listProgressForUser } from '../repositories/trainingProgress.repository';
import { AppError } from '../utils/AppError';
import { toSafeUser, type SafeUser } from './auth.service';

/**
 * DEPRECATED: This function previously set User.trainingCompletedAt but is no longer
 * used in the current Adparlorr customer workflow. The new product-image training
 * task system (see trainingTaskCompletion.service.ts) is now the authoritative
 * source for training completion status.
 *
 * Preserved for backward compatibility only. Does not affect the deposit gate
 * which now relies solely on the training task system.
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
