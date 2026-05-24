import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis';
import { query, queryOne } from '../config/database';
import { TokenPayload, AuthTokens } from '../types';

const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
}

export async function generateTokenPair(payload: TokenPayload): Promise<AuthTokens> {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000);

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), payload.userId, tokenHash, expiresAt]
  );

  await redis.setex(`session:${payload.userId}`, REFRESH_EXPIRES_SECONDS, JSON.stringify(payload));

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);

  const tokens = await query<{ id: string; token_hash: string; revoked: boolean }>(
    'SELECT id, token_hash, revoked FROM refresh_tokens WHERE user_id = $1 AND revoked = false AND expires_at > NOW()',
    [payload.userId]
  );

  let validToken = null;
  for (const t of tokens) {
    if (await bcrypt.compare(refreshToken, t.token_hash)) {
      validToken = t;
      break;
    }
  }

  if (!validToken) throw new Error('Invalid refresh token');

  await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [validToken.id]);

  return generateTokenPair({ userId: payload.userId, email: payload.email, username: payload.username });
}

export async function revokeAllTokens(userId: string) {
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
  await redis.del(`session:${userId}`);
}
