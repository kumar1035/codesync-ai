import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Kafka, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4007;

app.use(helmet()); app.use(cors({ origin: '*' })); app.use(express.json()); app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });
const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3, enableReadyCheck: false });
pubClient.on('error', (err) => console.warn('[notification-service] Redis pub error:', err.message));
const subClient = pubClient.duplicate();
subClient.on('error', (err) => console.warn('[notification-service] Redis sub error:', err.message));
const kafka = new Kafka({ clientId: 'notification-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], logLevel: logLevel.WARN });

const io = new Server(httpServer, { cors: { origin: '*' } });
io.adapter(createAdapter(pubClient, subClient));

// userId → socketId mapping
const userSockets = new Map<string, string>();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth required'));
  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  userSockets.set(userId, socket.id);
  socket.join(`user:${userId}`);

  socket.on('disconnect', () => { userSockets.delete(userId); });
});

async function sendNotification(userId: string, type: string, title: string, message: string, data: object = {}) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO notifications (id, user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, userId, type, title, message, JSON.stringify(data)]
  );
  io.to(`user:${userId}`).emit('notification', { id, type, title, message, data, ts: Date.now() });
}

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'notification-consumer' });
  try {
    await consumer.connect();
  } catch {
    console.warn('[notification-service] Kafka unavailable, consumer will not start');
    return;
  }
  await consumer.subscribe({ topics: ['notification-events', 'execution-events', 'room-events'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value?.toString() || '{}');
        if (data.type === 'execution_completed' && data.userId) {
          await sendNotification(data.userId, 'execution', 'Execution Complete',
            `Your ${data.language} code finished in ${data.executionTimeMs}ms`, data);
        }
        if (data.type === 'member_invited' && data.userId) {
          await sendNotification(data.userId, 'invite', 'Room Invite',
            'You have been added to a room', data);
        }
      } catch (err) { console.error('[notification] consumer error:', err); }
    }
  });
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.get('/notifications', async (req: any, res: any) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any;
    const rows = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [user.userId]
    );
    res.json({ success: true, data: rows.rows });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

app.put('/notifications/:id/read', async (req: any, res: any) => {
  await pool.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

async function bootstrap() {
  await startConsumer();
  httpServer.listen(PORT, () => console.log(`[notification-service] running on port ${PORT}`));
}
bootstrap().catch(console.error);
