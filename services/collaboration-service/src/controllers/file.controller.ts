import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database';
import { publishEvent } from '../config/kafka';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

async function assertMembership(roomId: string, userId: string) {
  const m = await queryOne('SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
  if (!m) throw new AppError(403, 'Not a member of this room');
  return m as { role: string };
}

export async function listFiles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await assertMembership(req.params.roomId, req.user!.userId);
    const files = await query(
      'SELECT id, filename, language, created_by, created_at, updated_at FROM files WHERE room_id = $1 ORDER BY filename',
      [req.params.roomId]
    );
    res.json({ success: true, data: files });
  } catch (err) { next(err); }
}

export async function createFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const member = await assertMembership(req.params.roomId, req.user!.userId);
    if (member.role === 'viewer') throw new AppError(403, 'Viewers cannot create files');

    const { filename, language = 'javascript', content = '' } = req.body;
    if (!filename) throw new AppError(400, 'filename required');

    const [file] = await query(
      'INSERT INTO files (id, room_id, filename, content, language, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [uuidv4(), req.params.roomId, filename, content, language, req.user!.userId]
    );

    await publishEvent('collaboration-events', req.params.roomId, {
      type: 'file_created', roomId: req.params.roomId, fileId: (file as any).id, userId: req.user!.userId, ts: Date.now()
    });

    res.status(201).json({ success: true, data: file });
  } catch (err) { next(err); }
}

export async function getFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = await queryOne<{ room_id: string }>('SELECT * FROM files WHERE id = $1', [req.params.id]);
    if (!file) throw new AppError(404, 'File not found');
    await assertMembership(file.room_id, req.user!.userId);
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
}

export async function updateFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = await queryOne<{ room_id: string; content: string; version_number?: number }>(
      'SELECT room_id, content FROM files WHERE id = $1', [req.params.id]
    );
    if (!file) throw new AppError(404, 'File not found');
    const member = await assertMembership(file.room_id, req.user!.userId);
    if (member.role === 'viewer') throw new AppError(403, 'Viewers cannot edit files');

    const { content, language } = req.body;

    // Save version snapshot before update
    const versionCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM file_versions WHERE file_id = $1', [req.params.id]
    );
    const nextVersion = parseInt(versionCount?.count || '0') + 1;

    await query(
      'INSERT INTO file_versions (id, file_id, version_number, content_snapshot, created_by) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), req.params.id, nextVersion, file.content, req.user!.userId]
    );

    const [updated] = await query(
      'UPDATE files SET content = COALESCE($1, content), language = COALESCE($2, language) WHERE id = $3 RETURNING *',
      [content, language, req.params.id]
    );

    await publishEvent('collaboration-events', file.room_id, {
      type: 'file_updated', roomId: file.room_id, fileId: req.params.id, userId: req.user!.userId, ts: Date.now()
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = await queryOne<{ room_id: string }>('SELECT room_id FROM files WHERE id = $1', [req.params.id]);
    if (!file) throw new AppError(404, 'File not found');
    const member = await assertMembership(file.room_id, req.user!.userId);
    if (member.role === 'viewer') throw new AppError(403, 'Viewers cannot delete files');
    await query('DELETE FROM files WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}
