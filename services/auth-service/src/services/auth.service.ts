import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database';
import { publishEvent } from '../config/kafka';
import { generateTokenPair } from './token.service';
import { User, RegisterDto, LoginDto, AuthTokens } from '../types';
import { AppError } from '../middleware/error.middleware';

export async function register(dto: RegisterDto): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
  const existing = await queryOne<User>('SELECT id FROM users WHERE email = $1 OR username = $2', [dto.email, dto.username]);
  if (existing) throw new AppError(409, 'Email or username already taken');

  const password_hash = await bcrypt.hash(dto.password, 12);
  const id = uuidv4();

  const [user] = await query<User>(
    'INSERT INTO users (id, username, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username, email, avatar_url, provider, is_active, last_seen_at, created_at, updated_at',
    [id, dto.username, dto.email, password_hash]
  );

  const tokens = await generateTokenPair({ userId: user.id, email: user.email, username: user.username });

  await publishEvent('analytics-events', user.id, { type: 'user_registered', userId: user.id, ts: Date.now() });

  return { user, tokens };
}

export async function login(dto: LoginDto): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
  const user = await queryOne<User>(
    'SELECT id, username, email, password_hash, avatar_url, provider, is_active, last_seen_at, created_at, updated_at FROM users WHERE email = $1',
    [dto.email]
  );

  if (!user) throw new AppError(401, 'Invalid email or password');
  if (!user.is_active) throw new AppError(403, 'Account is deactivated');

  const valid = await bcrypt.compare(dto.password, user.password_hash!);
  if (!valid) throw new AppError(401, 'Invalid email or password');

  await query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id]);

  const tokens = await generateTokenPair({ userId: user.id, email: user.email, username: user.username });

  await publishEvent('analytics-events', user.id, { type: 'user_login', userId: user.id, ts: Date.now() });

  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}
