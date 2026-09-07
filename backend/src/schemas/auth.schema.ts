import { z } from 'zod';

// The login identifier going forward (see auth.service.ts) — normalized to
// a canonical trimmed/lowercased form so uniqueness and lookups are
// effectively case-insensitive via the plain DB unique constraint.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, underscores, and hyphens.');

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').max(120),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('A valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(200),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(20)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

// Deliberately more lenient than usernameSchema above: a user registered
// before this format was enforced (see the username-backfill migration)
// may have a legacy value outside the new format (e.g. containing a dot)
// — login must still accept it. Only normalization + non-empty are
// required here; the strict format is enforced at registration time only.
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username is required.').max(60),
  password: z.string().min(1, 'Password is required.'),
});
