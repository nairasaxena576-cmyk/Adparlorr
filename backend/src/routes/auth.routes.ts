import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { requireAuth } from '../middleware/requireAuth';
import { authRateLimiter } from '../middleware/rateLimit';
import { verifyCsrf } from '../middleware/csrf';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate({ body: registerSchema }), register);
authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
authRouter.post('/logout', requireAuth, verifyCsrf, logout);
authRouter.get('/me', requireAuth, me);
