import 'dotenv/config';
import { z } from 'zod';

// z.coerce.boolean() would turn the string "false" into `true` (JS treats
// any non-empty string as truthy), silently marking cookies Secure even
// when explicitly disabled. Parse "true"/"false" text explicitly instead.
const booleanFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? defaultValue : v === 'true'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  COOKIE_SECURE: booleanFromEnv(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),

  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(6).optional(),

  SIMULATION_MERGE_THRESHOLD: z.coerce.number().int().positive().default(15),
  SIMULATION_MIN_WITHDRAWAL_BALANCE: z.coerce.number().nonnegative().default(100),
  SIMULATION_MAX_DEPOSIT_AMOUNT: z.coerce.number().positive().default(100_000),
});

// Placeholder-looking secrets that must never reach a production process —
// catches ".env.example" values (or copies of them) accidentally left in
// place rather than replaced with a real generated secret.
const PLACEHOLDER_SECRET_PATTERNS = [/changeme/i, /placeholder/i, /your-?secret/i, /replace-?me/i, /example/i];

const validatedSchema = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (PLACEHOLDER_SECRET_PATTERNS.some((re) => re.test(data.JWT_SECRET))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET looks like a placeholder value — set a real generated secret in production.',
      });
    }
    if (!data.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production (cookies are sent over HTTPS only).',
      });
    }
  }

  // SameSite=None cookies are rejected by browsers unless also Secure — true
  // regardless of environment, so enforce it structurally rather than only in prod.
  if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['COOKIE_SECURE'],
      message: 'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true (browsers reject None cookies without Secure).',
    });
  }

  if (data.CORS_ORIGIN === '*') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN must be an explicit origin, not "*" — required for credentialed cross-origin requests.',
    });
  }
});

const parsed = validatedSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration. Check your .env against .env.example.');
}

export const env = parsed.data;
export type Env = typeof env;
