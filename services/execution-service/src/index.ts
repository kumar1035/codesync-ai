import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { Kafka, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { executeCode } from './executor/docker.executor';

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });
const kafka = new Kafka({ clientId: 'execution-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], logLevel: logLevel.WARN });
const producer = kafka.producer();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; username: string };
}

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as AuthRequest['user'];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

const executionLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Execution rate limit exceeded' } });

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp', 'java'];

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'execution-service', supported: SUPPORTED_LANGUAGES }));

app.post('/execute', authenticate, executionLimiter, async (req: AuthRequest, res: Response) => {
  const { language, code, stdin = '', roomId } = req.body;

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}` });
  }
  if (!code || code.trim().length === 0) {
    return res.status(400).json({ error: 'Code is required' });
  }
  if (code.length > 100000) {
    return res.status(400).json({ error: 'Code too large (max 100KB)' });
  }

  const executionId = uuidv4();
  const timeout = Number(process.env.EXECUTION_TIMEOUT) || 30000;
  const memLimit = parseInt((process.env.EXECUTION_MEMORY_LIMIT || '128m').replace('m', ''));

  // Best-effort DB tracking — if executions table doesn't exist yet, don't crash
  pool.query(
    'INSERT INTO executions (id, room_id, user_id, language, code, stdin, status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [executionId, roomId, req.user!.userId, language, code, stdin, 'running']
  ).catch(() => {});

  try {
    const result = await executeCode(language, code, stdin, timeout, memLimit);

    pool.query(
      `UPDATE executions SET status=$1, output=$2, stderr=$3, exit_code=$4, execution_time_ms=$5, completed_at=NOW() WHERE id=$6`,
      [result.exitCode === 0 ? 'completed' : 'failed', result.stdout, result.stderr, result.exitCode, result.executionTimeMs, executionId]
    ).catch(() => {});

    producer.send({
      topic: 'execution-events',
      messages: [{ key: executionId, value: JSON.stringify({ type: 'execution_completed', executionId, language, userId: req.user!.userId, roomId, exitCode: result.exitCode, executionTimeMs: result.executionTimeMs, ts: Date.now() }) }]
    }).catch(() => {});

    return res.json({ success: true, data: { executionId, ...result } });
  } catch (err: any) {
    const isTimeout = err.message?.includes('timeout') || err.message?.includes('Timeout');

    pool.query(
      'UPDATE executions SET status=$1, stderr=$2, completed_at=NOW() WHERE id=$3',
      [isTimeout ? 'timeout' : 'failed', err.message, executionId]
    ).catch(() => {});

    producer.send({
      topic: 'execution-events',
      messages: [{ key: executionId, value: JSON.stringify({ type: 'execution_failed', executionId, language, error: err.message, ts: Date.now() }) }]
    }).catch(() => {});

    return res.status(500).json({ error: isTimeout ? 'Execution timed out' : 'Execution failed', details: err.message });
  }
});

app.get('/execute/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const row = await pool.query('SELECT * FROM executions WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
  if (!row.rows[0]) return res.status(404).json({ error: 'Execution not found' });
  res.json({ success: true, data: row.rows[0] });
});

app.get('/execute/room/:roomId', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await pool.query(
    'SELECT id, language, status, exit_code, execution_time_ms, created_at FROM executions WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.params.roomId]
  );
  res.json({ success: true, data: rows.rows });
});

async function bootstrap() {
  try {
    await producer.connect();
    console.log('[execution-service] Kafka producer connected');
  } catch {
    console.warn('[execution-service] Kafka unavailable, events will be skipped');
  }
  app.listen(PORT, () => console.log(`[execution-service] running on port ${PORT}`));
}

bootstrap().catch(console.error);
