import { AppError } from '../utils/AppError';
import {
  listReferralsMadeBy,
  findReferralByReferredUserId,
  setReferralTrainingFunding,
  createReferral,
} from '../repositories/referral.repository';
import { findUserById, findUserByReferralCode } from '../repositories/user.repository';
import { getCurrentTier, isEligibleReferrerTier, type Tier } from '../utils/tiers';

// $1,000 training-funding requirement, fixed per the approved spec — not
// configurable per referral, just recorded on the row for audit/display.
const TRAINING_FUNDING_REQUIRED_AMOUNT = 1000;

export async function getMyReferrals(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const referrals = await listReferralsMadeBy(userId);

  return {
    referralCode: user.referralCode,
    referrals: referrals.map((r) => ({
      fullName: r.referredUser.fullName,
      status: r.status,
      createdAt: r.referredUser.createdAt,
    })),
    stats: {
      joined: referrals.length,
      active: referrals.filter((r) => r.status === 'ACTIVE').length,
    },
  };
}

// ---- Training-access referral gate ----
// See trainingTask.service.ts's assertTrainingUnlocked(), which is the only
// caller that actually gates task access on this. Nothing here trusts any
// referrer id/tier/funding state supplied by a client — everything is
// resolved from the stored Referral row and the referrer's own real
// User columns.

export interface TrainingReferralStatus {
  hasReferral: boolean;
  referralId: string | null;
  referrerName: string | null;
  referrerTier: Tier | null;
  tierEligible: boolean;
  trainingFundingRequired: number | null;
  trainingFundedAt: string | null;
  fundingComplete: boolean;
}

async function buildTrainingReferralStatus(userId: string): Promise<TrainingReferralStatus> {
  const referral = await findReferralByReferredUserId(userId);
  if (!referral) {
    return {
      hasReferral: false,
      referralId: null,
      referrerName: null,
      referrerTier: null,
      tierEligible: false,
      trainingFundingRequired: null,
      trainingFundedAt: null,
      fundingComplete: false,
    };
  }

  const tier = getCurrentTier(referral.referrer.completedOrders, Number(referral.referrer.totalDeposits));

  return {
    hasReferral: true,
    referralId: referral.id,
    referrerName: referral.referrer.fullName,
    referrerTier: tier,
    tierEligible: isEligibleReferrerTier(tier),
    trainingFundingRequired: referral.trainingFundingRequired ? Number(referral.trainingFundingRequired) : null,
    trainingFundedAt: referral.trainingFundedAt ? referral.trainingFundedAt.toISOString() : null,
    fundingComplete: Boolean(referral.trainingFundedAt),
  };
}

export async function getTrainingReferralStatus(userId: string): Promise<TrainingReferralStatus> {
  return buildTrainingReferralStatus(userId);
}

// Called only when the customer submits a referral code on the Training
// eligibility screen. Resolves the code server-side; the frontend never
// supplies a referrer id or tier.
export async function verifyReferralForTraining(userId: string, code: string): Promise<TrainingReferralStatus> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const referrer = await findUserByReferralCode(code.trim().toUpperCase());
  if (!referrer) throw AppError.badRequest('Invalid referral code.');
  if (referrer.id === userId) throw AppError.badRequest('You cannot use your own referral code.');

  const tier = getCurrentTier(referrer.completedOrders, Number(referrer.totalDeposits));
  if (!isEligibleReferrerTier(tier)) {
    throw AppError.forbidden(
      `This referral code belongs to a ${tier} member. The inviter must be Gold or Platinum tier to sponsor training.`
    );
  }

  const existing = await findReferralByReferredUserId(userId);

  if (existing) {
    // Once a referral has actually been verified for training (i.e. it
    // already has a funding requirement attached), it is locked — the
    // referrer can never be swapped after that point. A referral that only
    // exists from registration (never verified here) has no funding
    // requirement yet and can still be pointed at a different, eligible
    // referrer.
    if (existing.trainingFundingRequired !== null && existing.referrerId !== referrer.id) {
      throw AppError.conflict('A referral has already been verified for your training and cannot be changed.');
    }
    if (existing.referrerId !== referrer.id || existing.trainingFundingRequired === null) {
      await setReferralTrainingFunding(existing.id, {
        referrerId: referrer.id,
        status: 'PENDING',
        trainingFundingRequired: TRAINING_FUNDING_REQUIRED_AMOUNT,
      });
    }
  } else {
    await createReferral({
      referrerId: referrer.id,
      referredUserId: userId,
      status: 'PENDING',
      trainingFundingRequired: TRAINING_FUNDING_REQUIRED_AMOUNT,
    });
  }

  return buildTrainingReferralStatus(userId);
}
