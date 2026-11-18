import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';
import { HttpError } from '../utils/httpError';

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    return { id: payload.id, role: payload.role };
  } catch {
    return null;
  }
}

/** Requires a valid "Authorization: Bearer <jwt>" header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = token ? verifyToken(token) : null;
  if (!user) return next(new HttpError(401, 'Please log in to continue'));
  req.user = user;
  next();
}

/** Only accounts with role "admin" can use simulation controls and admin views. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admin access required'));
  next();
}
