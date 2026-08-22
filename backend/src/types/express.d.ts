import type { Role } from '@prisma/client';
import type { SafeUser } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser & { role: Role };
    }
  }
}

export {};
