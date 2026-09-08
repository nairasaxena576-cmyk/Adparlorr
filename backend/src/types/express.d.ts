import type { Role } from '@prisma/client';
import type { SafeUser } from '../services/auth.service';
import type { SupportIdentity } from '../middleware/supportIdentity';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser & { role: Role };
      supportIdentity?: SupportIdentity;
      // Set only when resolveSupportIdentity minted a brand-new CSRF cookie
      // this same request (a guest's very first contact) — req.cookies
      // never reflects a cookie set on the outgoing response, so this is
      // how the controller still returns the correct token in the body on
      // that first round-trip. See support.controller.ts.
      freshCsrfToken?: string;
    }
  }
}

export {};
