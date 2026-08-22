import { describe, it, expect } from 'vitest';
import { registerAndLogin } from './helpers';

// The rest of training-completion coverage (setting trainingCompletedAt only
// via a passed course assessment, and confirming the old blind-complete
// endpoint is gone) lives in trainingAssessment.test.ts, since completion is
// now entirely a side effect of assessment scoring rather than its own
// standalone action.
describe('training', () => {
  it('starts uncompleted for a new user', async () => {
    const { body } = await registerAndLogin();
    expect(body.data.user.trainingCompletedAt).toBeNull();
  });
});
