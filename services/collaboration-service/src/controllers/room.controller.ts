import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/database';
import { publishEvent } from '../config/kafka';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export async function listRooms(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rooms = await query(
      `SELECT r.*, rm.role FROM rooms r
       JOIN room_members rm ON rm.room_id = r.id
       WHERE rm.user_id = $1 ORDER BY r.created_at DESC`,
      [req.user!.userId]
    );
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
}

export async function createRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { room_name, description, is_public } = req.body;
    if (!room_name) throw new AppError(400, 'room_name required');
    const id = uuidv4();
    const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const [room] = await query(
      `INSERT INTO rooms (id, room_name, description, owner_id, is_public, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, room_name, description, req.user!.userId, is_public ?? false, invite_code]
    );

    await query(
      'INSERT INTO room_members (id, room_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [uuidv4(), id, req.user!.userId, 'owner']
    );

    await publishEvent('room-events', id, { type: 'room_created', roomId: id, userId: req.user!.userId, ts: Date.now() });

    res.status(201).json({ success: true, data: room });
  } catch (err) { next(err); }
}

export async function getRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await queryOne(
      `SELECT r.* FROM rooms r
       JOIN room_members rm ON rm.room_id = r.id
       WHERE r.id = $1 AND rm.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (!room) throw new AppError(404, 'Room not found or access denied');
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
}

export async function updateRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const member = await queryOne<{ role: string }>(
      'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    if (!member || !['owner', 'editor'].includes(member.role)) throw new AppError(403, 'Insufficient permissions');

    const { room_name, description, is_public } = req.body;
    const room = await queryOne(
      'UPDATE rooms SET room_name = COALESCE($1, room_name), description = COALESCE($2, description), is_public = COALESCE($3, is_public) WHERE id = $4 RETURNING *',
      [room_name, description, is_public, req.params.id]
    );
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
}

export async function deleteRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await queryOne<{ owner_id: string }>('SELECT owner_id FROM rooms WHERE id = $1', [req.params.id]);
    if (!room) throw new AppError(404, 'Room not found');
    if (room.owner_id !== req.user!.userId) throw new AppError(403, 'Only owner can delete');
    await query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    await publishEvent('room-events', req.params.id, { type: 'room_deleted', roomId: req.params.id, ts: Date.now() });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function joinRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await queryOne<{ id: string; is_public: boolean }>('SELECT id, is_public FROM rooms WHERE id = $1', [req.params.id]);
    if (!room) throw new AppError(404, 'Room not found');
    if (!room.is_public) throw new AppError(403, 'Room is private. Use invite code.');

    await query(
      'INSERT INTO room_members (id, room_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (room_id, user_id) DO NOTHING',
      [uuidv4(), req.params.id, req.user!.userId, 'viewer']
    );
    await publishEvent('room-events', req.params.id, { type: 'member_joined', roomId: req.params.id, userId: req.user!.userId, ts: Date.now() });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function leaveRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getMembers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const members = await query(
      `SELECT u.id, u.username, u.email, u.avatar_url, rm.role, rm.joined_at
       FROM room_members rm JOIN users u ON u.id = rm.user_id WHERE rm.room_id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
}

export async function inviteByCode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { invite_code } = req.body;
    const room = await queryOne<{ id: string }>('SELECT id FROM rooms WHERE invite_code = $1', [invite_code]);
    if (!room) throw new AppError(404, 'Invalid invite code');
    await query(
      'INSERT INTO room_members (id, room_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (room_id, user_id) DO NOTHING',
      [uuidv4(), room.id, req.user!.userId, 'editor']
    );
    await publishEvent('room-events', room.id, { type: 'member_invited', roomId: room.id, userId: req.user!.userId, ts: Date.now() });
    res.json({ success: true, data: { roomId: room.id } });
  } catch (err) { next(err); }
}

export async function joinByInviteCode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await queryOne<{ id: string }>('SELECT id FROM rooms WHERE invite_code = $1', [req.params.code]);
    if (!room) throw new AppError(404, 'Invalid invite code');
    await query(
      'INSERT INTO room_members (id, room_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (room_id, user_id) DO NOTHING',
      [uuidv4(), room.id, req.user!.userId, 'editor']
    );
    await publishEvent('room-events', room.id, { type: 'member_invited', roomId: room.id, userId: req.user!.userId, ts: Date.now() });
    res.json({ success: true, data: { room_id: room.id } });
  } catch (err) { next(err); }
}
