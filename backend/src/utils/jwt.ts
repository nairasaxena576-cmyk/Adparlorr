import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  sessionVersion: number;
}

const signOptions: SignOptions = {
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

export function signAuthToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, signOptions);
}

export function verifyAuthToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
