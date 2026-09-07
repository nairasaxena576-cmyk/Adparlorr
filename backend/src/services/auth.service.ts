import type { Role, User } from '@prisma/client';
import type { Tier } from '../utils/tiers';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAuthToken } from '../utils/jwt';
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserByReferralCode,
  incrementSessionVersion,
} from '../repositories/user.repository';
import { createReferral } from '../repositories/referral.repository';

export interface SafeUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: Role;
  referralCode: string;
  balance: number;
  workbenchBalance: number;
  totalEarnings: number;
  totalDeposits: number;
  completedOrders: number;
  isMerged: boolean;
  trainingCompletedAt: Date | null;
  // Admin-granted tier override (pay-to-unlock) — combine with
  // completedOrders/totalDeposits via resolveEffectiveTier() to get the
  // customer's actual current tier; this alone is not the effective tier.
  manualTier: Tier | null;
  createdAt: Date;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    referralCode: user.referralCode,
    balance: Number(user.balance),
    workbenchBalance: Number(user.workbenchBalance),
    totalEarnings: Number(user.totalEarnings),
    totalDeposits: Number(user.totalDeposits),
    completedOrders: user.completedOrders,
    isMerged: user.isMerged,
    trainingCompletedAt: user.trainingCompletedAt,
    manualTier: user.manualTier,
    createdAt: user.createdAt,
  };
}

const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomReferralCode(): string {
  return Array.from(
    { length: 6 },
    () => REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)]
  ).join('');
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomReferralCode();
    const existing = await findUserByReferralCode(candidate);
    if (!existing) return candidate;
  }
  throw new Error('Failed to generate a unique referral code after multiple attempts.');
}

export interface RegisterInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  referralCode?: string;
}

export async function registerUser(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
  const existingEmail = await findUserByEmail(input.email);
  if (existingEmail) {
    throw AppError.conflict('An account with this email already exists.');
  }
  const existingUsername = await findUserByUsername(input.username);
  if (existingUsername) {
    throw AppError.conflict('This username is already taken.');
  }

  const passwordHash = await hashPassword(input.password);
  const referralCode = await generateUniqueReferralCode();

  // The submitted code identifies the inviter (referrer), not the new
  // user's own code. An unrecognized code does not block registration —
  // it's simply not linked to anyone.
  const referrer = input.referralCode ? await findUserByReferralCode(input.referralCode) : null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await createUser(
      {
        fullName: input.fullName,
        username: input.username,
        email: input.email,
        passwordHash,
        referralCode,
      },
      tx
    );

    if (referrer) {
      await createReferral(
        { referrerId: referrer.id, referredUserId: created.id, status: 'PENDING' },
        tx
      );
    }

    return created;
  });

  const token = signAuthToken({ sub: user.id, role: user.role, sessionVersion: user.sessionVersion });
  return { user: toSafeUser(user), token };
}

export interface LoginInput {
  username: string;
  password: string;
}

// Never trusts anything but username+password from the client — no userId,
// email, or role is ever read from the request body here (see
// auth.controller.ts, which passes the whole validated req.body through,
// and loginSchema, which only recognizes these two fields).
export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  const user = await findUserByUsername(input.username);
  if (!user) throw AppError.unauthorized('Invalid username or password.');

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Invalid username or password.');

  const token = signAuthToken({ sub: user.id, role: user.role, sessionVersion: user.sessionVersion });
  return { user: toSafeUser(user), token };
}

export async function logoutUser(userId: string): Promise<void> {
  // Bumping sessionVersion invalidates every outstanding JWT for this user,
  // on every device, immediately — not just the cookie held by this client.
  await incrementSessionVersion(userId);
}
