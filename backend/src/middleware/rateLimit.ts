import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// The test suite legitimately calls register/login far more than any real
// client would (every test's setup goes through registerAndLogin /
// createAdminAndLogin), which would otherwise trip these limiters on their
// own test fixtures rather than anything worth catching. Rate limiting
// itself isn't under test anywhere, so it's skipped outright in NODE_ENV=test
// rather than loosened for production traffic.
const skipInTests = () => env.NODE_ENV === 'test';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
