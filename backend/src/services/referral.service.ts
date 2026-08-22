import { AppError } from '../utils/AppError';
import { listReferralsMadeBy } from '../repositories/referral.repository';
import { findUserById } from '../repositories/user.repository';

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
