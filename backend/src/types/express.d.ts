import type { Role } from '@prisma/client';
import type { SafeUser } from '../services/auth.service';
import type { SupportIdentity } from '../middleware/supportIdentity';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser & { role: Role };
      supportIdentity?: SupportIdentity;
    }
  }
}

export {};
