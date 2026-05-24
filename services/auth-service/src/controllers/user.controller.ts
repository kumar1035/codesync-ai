import { Response, NextFunction } from 'express';
import { queryOne, query } from '../config/database';
import { User } from '../types';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await queryOne<User>(
      'SELECT id, username, email, avatar_url, provider, is_active, last_seen_at, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (!user) throw new AppError(404, 'User not found');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { username, avatar_url } = req.body;
    const user = await queryOne<User>(
      'UPDATE users SET username = COALESCE($1, username), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, username, email, avatar_url',
      [username, avatar_url, req.user!.userId]
    );
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await queryOne<User>(
      'SELECT id, username, email, avatar_url, last_seen_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user) throw new AppError(404, 'User not found');
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
