import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Kafka, logLevel, Consumer } from 'kafkajs';

const app = express();
const PORT = process.env.PORT || 4006;

app.use(helmet()); app.use(cors({ origin: '*' })); app.use(express.json()); app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379, password: process.env.REDIS_PASSWORD });
const kafka = new Kafka({ clientId: 'analytics-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], logLevel: logLevel.WARN });

interface AuthRequest extends Request { user?: { userId: string } }
function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any; next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// Analytics counters stored in Redis
async function increment(key: string, amount = 1) {
  await redis.incrby(`analytics:${key}`, amount);
}

// Kafka consumers for all topics
async function startConsumers() {
  const consumer = kafka.consumer({ groupId: 'analytics-consumer' });
  try {
    await consumer.connect();
  } catch {
    console.warn('[analytics-service] Kafka unavailable, consumers will not start');
    return;
  }

  const topics = ['room-events', 'collaboration-events', 'execution-events', 'ai-events', 'notification-events'];
  await consumer.subscribe({ topics, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value?.toString() || '{}');
        switch (data.type) {
          case 'user_registered': await increment('total_registrations'); break;
          case 'user_login': await increment('total_logins'); await increment('active_users'); break;
          case 'room_created': await increment('total_rooms'); await increment('active_rooms'); break;
          case 'member_joined': await increment('room_joins'); break;
          case 'file_operation': await increment('total_operations'); break;
          case 'execution_completed': await increment('total_executions'); await increment(`executions:${data.language}`); break;
          case 'ai_interaction': await increment('total_ai_interactions'); await increment(`ai:${data.interactionType}`); break;
        }

        // Store event log
        await pool.query(
          'INSERT INTO event_logs (id, room_id, user_id, event_type, payload) VALUES (gen_random_uuid(),$1,$2,$3,$4)',
          [data.roomId, data.userId, data.type, JSON.stringify(data)]
        );
      } catch (err) { console.error('[analytics] consumer error:', err); }
    }
  });
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'analytics-service' }));

app.get('/analytics/overview', authenticate, async (req: AuthRequest, res: Response) => {
  const keys = ['total_registrations','total_logins','active_users','total_rooms','active_rooms','room_joins','total_operations','total_executions','total_ai_interactions'];
  const values = await Promise.all(keys.map(k => redis.get(`analytics:${k}`)));
  const overview: Record<string, number> = {};
  keys.forEach((k, i) => { overview[k] = parseInt(values[i] || '0'); });
  res.json({ success: true, data: overview });
});

app.get('/analytics/executions', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await pool.query(
    `SELECT language, status, COUNT(*) as count, AVG(execution_time_ms) as avg_time
     FROM executions GROUP BY language, status ORDER BY count DESC LIMIT 50`
  );
  res.json({ success: true, data: rows.rows });
});

app.get('/analytics/ai', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await pool.query(
    `SELECT interaction_type, COUNT(*) as count, AVG(latency_ms) as avg_latency
     FROM ai_interactions GROUP BY interaction_type ORDER BY count DESC`
  );
  res.json({ success: true, data: rows.rows });
});

app.get('/analytics/active-rooms', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await pool.query(
    `SELECT r.id, r.room_name, COUNT(rm.user_id) as member_count
     FROM rooms r LEFT JOIN room_members rm ON rm.room_id = r.id
     GROUP BY r.id, r.room_name ORDER BY member_count DESC LIMIT 20`
  );
  res.json({ success: true, data: rows.rows });
});

app.get('/analytics/events', authenticate, async (req: AuthRequest, res: Response) => {
  const { limit = 100, event_type } = req.query;
  const rows = event_type
    ? await pool.query('SELECT * FROM event_logs WHERE event_type = $1 ORDER BY created_at DESC LIMIT $2', [event_type, limit])
    : await pool.query('SELECT * FROM event_logs ORDER BY created_at DESC LIMIT $1', [limit]);
  res.json({ success: true, data: rows.rows });
});

async function bootstrap() {
  await startConsumers();
  app.listen(PORT, () => console.log(`[analytics-service] running on port ${PORT}`));
}
bootstrap().catch(console.error);
