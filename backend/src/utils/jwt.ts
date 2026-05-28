import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JwtPayload } from '../types';

/** Sign a short-lived access token (15 min). */
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Verify and decode an access token; throws on invalid/expired. */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

/** Generate a cryptographically random 64-character hex token for refresh / reset. */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Generate a SHA-256 hex hash of input (used for vote receipts, result checksums). */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
