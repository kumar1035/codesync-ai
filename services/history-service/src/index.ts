import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 4008;

app.use(helmet()); app.use(cors({ origin: '*' })); app.use(express.json()); app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });

interface AuthRequest extends Request { user?: { userId: string } }
function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any; next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'history-service' }));

// Get all versions of a file
app.get('/history/file/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await pool.query(
    `SELECT fv.*, u.username as created_by_username
     FROM file_versions fv
     LEFT JOIN users u ON u.id = fv.created_by
     WHERE fv.file_id = $1 ORDER BY fv.version_number DESC`,
    [req.params.fileId]
  );
  res.json({ success: true, data: rows.rows });
});

// Get a specific version
app.get('/history/version/:versionId', authenticate, async (req: AuthRequest, res: Response) => {
  const row = await pool.query('SELECT * FROM file_versions WHERE id = $1', [req.params.versionId]);
  if (!row.rows[0]) return res.status(404).json({ error: 'Version not found' });
  res.json({ success: true, data: row.rows[0] });
});

// Restore a file to a specific version
app.post('/history/restore/:versionId', authenticate, async (req: AuthRequest, res: Response) => {
  const version = await pool.query(
    'SELECT fv.*, f.room_id FROM file_versions fv JOIN files f ON f.id = fv.file_id WHERE fv.id = $1',
    [req.params.versionId]
  );
  if (!version.rows[0]) return res.status(404).json({ error: 'Version not found' });

  const v = version.rows[0];

  // Check membership
  const member = await pool.query(
    'SELECT role FROM room_members WHERE room_id = $1 AND user_id = $2',
    [v.room_id, req.user!.userId]
  );
  if (!member.rows[0] || member.rows[0].role === 'viewer') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  await pool.query('UPDATE files SET content = $1, updated_at = NOW() WHERE id = $2', [v.content_snapshot, v.file_id]);

  res.json({ success: true, message: `File restored to version ${v.version_number}` });
});

// Event log replay for a room
app.get('/history/room/:roomId/events', authenticate, async (req: AuthRequest, res: Response) => {
  const { since, limit = 200 } = req.query;
  const rows = since
    ? await pool.query(
        'SELECT * FROM event_logs WHERE room_id = $1 AND created_at > $2 ORDER BY sequence_number ASC LIMIT $3',
        [req.params.roomId, since, limit]
      )
    : await pool.query(
        'SELECT * FROM event_logs WHERE room_id = $1 ORDER BY sequence_number ASC LIMIT $2',
        [req.params.roomId, limit]
      );
  res.json({ success: true, data: rows.rows });
});

app.listen(PORT, () => console.log(`[history-service] running on port ${PORT}`));
