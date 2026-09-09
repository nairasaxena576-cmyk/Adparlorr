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

// CORS_ORIGIN accepts a comma-separated list of exact allowed origins (e.g.
// "https://adparlorr.com,https://test.adparlorr.com") so both the
// production frontend and a Namecheap test frontend can be allowed at
// once, without weakening this to origin: '*'. Trimmed and filtered of
// empty entries so trailing commas/stray whitespace are harmless. A single
// value (no comma) parses to a one-element array, preserving prior
// single-origin behavior exactly. Exported so config/cors.ts's actual CORS
// middleware reuses this exact parsing (single source of truth) rather
// than re-implementing it.
export function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

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

  SIMULATION_MIN_WITHDRAWAL_BALANCE: z.coerce.number().nonnegative().default(100),
  SIMULATION_MAX_DEPOSIT_AMOUNT: z.coerce.number().positive().default(100_000),

  // Continuous 4-tier workbench progression (see utils/tiers.ts). Each
  // *_ORDER_BAND is how many workbench order slots that tier spans — the
  // cumulative order milestones (0/40/45/50/55 in production) are derived
  // from these, never a second hardcoded set of numbers. Each
  // *_DEPOSIT_CAP is that tier's own absolute deposit ceiling (cumulative,
  // not a per-tier delta). Test overrides shrink these for fast fixtures —
  // see vitest.config.ts.
  SIMULATION_BRONZE_ORDER_BAND: z.coerce.number().int().positive().default(40),
  SIMULATION_SILVER_ORDER_BAND: z.coerce.number().int().positive().default(5),
  SIMULATION_GOLD_ORDER_BAND: z.coerce.number().int().positive().default(5),
  SIMULATION_PLATINUM_ORDER_BAND: z.coerce.number().int().positive().default(5),
  SIMULATION_BRONZE_DEPOSIT_CAP: z.coerce.number().positive().default(100),
  SIMULATION_SILVER_DEPOSIT_CAP: z.coerce.number().positive().default(500),
  SIMULATION_GOLD_DEPOSIT_CAP: z.coerce.number().positive().default(2000),
  SIMULATION_PLATINUM_DEPOSIT_CAP: z.coerce.number().positive().default(5000),

  // --- Supabase Storage (training task product images) --- backend-only.
  // Optional at the schema level so the app still boots locally / typechecks
  // / builds without real credentials — training.tasks image upload fails
  // clearly at the point of use (see lib/supabaseStorage.ts) rather than
  // blocking the whole process from starting. Required in production, see
  // the superRefine check below.
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL').optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('training-task-images'),

  // One-time production bootstrap switch for the 55-product Workbench
  // catalog (see src/bootstrap/workbenchCatalogBootstrap.ts) — for
  // environments (e.g. Render's free plan) with no Shell/One-Off Job
  // access to run `npm run db:seed` manually. Defaults to false/off; must
  // be explicitly set to the literal string "true" to do anything, and is
  // never honored outside NODE_ENV=production regardless of this flag —
  // see that module. Never enable this in a committed file.
  WORKBENCH_CATALOG_BOOTSTRAP: booleanFromEnv(false),
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
    if (!data.SUPABASE_URL || !data.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message:
          'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production — training task image upload has no local-disk fallback.',
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

  const corsOrigins = parseCorsOrigins(data.CORS_ORIGIN);
  if (corsOrigins.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN must contain at least one non-empty origin.',
    });
  } else if (corsOrigins.includes('*')) {
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
