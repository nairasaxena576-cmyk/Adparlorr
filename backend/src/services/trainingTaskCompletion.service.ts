import { findUserById, updateUser } from '../repositories/user.repository';
import { listPublishedRequiredTasks } from '../repositories/trainingTask.repository';
import { listApprovedTaskIdsForUser } from '../repositories/trainingTaskSubmission.repository';
import { AppError } from '../utils/AppError';
import { toSafeUser, type SafeUser } from './auth.service';

/**
 * The current writer of User.trainingCompletedAt — the source of truth the
 * deposit gate checks. Never settable directly by a client request; only
 * called as a side effect of an admin approving a submission (see
 * trainingTaskAdmin.service.ts approveSubmissionForAdmin).
 *
 * A user is "training complete" once every published + required
 * TrainingTask has an APPROVED submission from them. Mirrors the legacy
 * evaluateAndSetTrainingCompletion() in training.service.ts, which is left
 * in place but no longer called by anything in the app.
 */
export async function evaluateAndSetTaskTrainingCompletion(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  if (user.trainingCompletedAt) {
    return toSafeUser(user);
  }

  const requiredTasks = await listPublishedRequiredTasks();
  if (requiredTasks.length === 0) {
    return toSafeUser(user);
  }

  const approvedRows = await listApprovedTaskIdsForUser(
    userId,
    requiredTasks.map((t) => t.id)
  );
  const approvedTaskIds = new Set(approvedRows.map((r) => r.taskId));
  const allRequiredApproved = requiredTasks.every((t) => approvedTaskIds.has(t.id));

  if (!allRequiredApproved) {
    return toSafeUser(user);
  }

  const updated = await updateUser(userId, { trainingCompletedAt: new Date() });
  return toSafeUser(updated);
}
