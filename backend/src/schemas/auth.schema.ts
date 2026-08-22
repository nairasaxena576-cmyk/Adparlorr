import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').max(120),
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

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required.'),
  password: z.string().min(1, 'Password is required.'),
});
