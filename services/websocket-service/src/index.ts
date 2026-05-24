import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { Kafka, logLevel } from 'kafkajs';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4003;

// Redis pub/sub for horizontal scaling
const pubClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
});
const subClient = pubClient.duplicate();
const redis = pubClient.duplicate();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.adapter(createAdapter(pubClient, subClient));

const kafka = new Kafka({
  clientId: 'websocket-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.WARN,
});
const producer = kafka.producer();

// JWT auth middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; username: string };
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// In-memory OT state per file: { revision, content }
const fileState = new Map<string, { revision: number; content: string }>();

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`[ws] connected: ${user.username} (${socket.id})`);

  // Track presence
  redis.sadd(`presence:all`, user.userId);

  socket.on('room:join', async ({ roomId, fileId }) => {
    socket.join(`room:${roomId}`);

    if (fileId) {
      // Leave any other file rooms (user can only actively view one file at a time)
      for (const room of socket.rooms) {
        if (room.startsWith('file:') && room !== `file:${fileId}`) {
          socket.leave(room);
        }
      }
      socket.join(`file:${fileId}`);
    }

    // Load file state if not cached
    if (fileId && !fileState.has(fileId)) {
      const res = await pool.query('SELECT content FROM files WHERE id = $1', [fileId]);
      if (res.rows[0]) {
        fileState.set(fileId, { revision: 0, content: res.rows[0].content });
      }
    }

    // Presence tracking
    await redis.hset(`room:${roomId}:presence`, user.userId, JSON.stringify({
      userId: user.userId, username: user.username, socketId: socket.id, joinedAt: Date.now()
    }));

    const presence = await redis.hgetall(`room:${roomId}:presence`);
    const members = Object.values(presence).map(v => JSON.parse(v));

    io.to(`room:${roomId}`).emit('room:presence', { members });

    if (fileId) {
      const state = fileState.get(fileId) || { revision: 0, content: '' };
      socket.emit('file:state', { fileId, ...state });
    }

    producer.send({ topic: 'collaboration-events', messages: [{ key: roomId, value: JSON.stringify({ type: 'user_joined', roomId, userId: user.userId, ts: Date.now() }) }] }).catch(() => {});
  });

  socket.on('room:leave', async ({ roomId }) => {
    socket.leave(`room:${roomId}`);
    await redis.hdel(`room:${roomId}:presence`, user.userId);
    const presence = await redis.hgetall(`room:${roomId}:presence`);
    const members = Object.values(presence).map(v => JSON.parse(v));
    io.to(`room:${roomId}`).emit('room:presence', { members });
  });

  // Client sends a file operation (full-content sync, last-write-wins)
  socket.on('file:operation', async ({ fileId, roomId, operation }) => {
    const state = fileState.get(fileId) || { revision: 0, content: '' };

    if (operation.content !== undefined) {
      state.content = operation.content;
    }
    state.revision++;
    fileState.set(fileId, state);

    // Persist async
    pool.query('UPDATE files SET content = $1, updated_at = NOW() WHERE id = $2', [state.content, fileId]).catch(console.error);

    socket.emit('file:operation:ack', { ok: true, revision: state.revision, fileId });
    socket.to(`file:${fileId}`).emit('file:operation:broadcast', { fileId, operation, revision: state.revision, userId: user.userId });

    producer.send({ topic: 'collaboration-events', messages: [{ key: roomId, value: JSON.stringify({ type: 'file_operation', fileId, roomId, userId: user.userId, revision: state.revision, ts: Date.now() }) }] }).catch(() => {});
  });

  // Cursor tracking
  socket.on('cursor:update', ({ roomId, fileId, position, selection }) => {
    socket.to(`room:${roomId}`).emit('cursor:broadcast', {
      userId: user.userId,
      username: user.username,
      fileId,
      position,
      selection,
    });
  });

  // Typing indicator
  socket.on('typing:start', ({ roomId, fileId }) => {
    socket.to(`room:${roomId}`).emit('typing:broadcast', { userId: user.userId, username: user.username, fileId, typing: true });
  });

  socket.on('typing:stop', ({ roomId, fileId }) => {
    socket.to(`room:${roomId}`).emit('typing:broadcast', { userId: user.userId, username: user.username, fileId, typing: false });
  });

  // Chat messages
  socket.on('chat:message', ({ roomId, message }) => {
    io.to(`room:${roomId}`).emit('chat:broadcast', {
      id: Date.now().toString(),
      userId: user.userId,
      username: user.username,
      message,
      ts: Date.now(),
    });
  });

  // Execution result broadcast
  socket.on('execution:result', ({ roomId, result }) => {
    io.to(`room:${roomId}`).emit('execution:broadcast', result);
  });

  socket.on('disconnect', async () => {
    console.log(`[ws] disconnected: ${user.username}`);
    redis.srem(`presence:all`, user.userId);

    // Clean up from all rooms this socket was in
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('room:'));
    for (const room of rooms) {
      const roomId = room.replace('room:', '');
      await redis.hdel(`room:${roomId}:presence`, user.userId);
      const presence = await redis.hgetall(`room:${roomId}:presence`);
      const members = Object.values(presence).map(v => JSON.parse(v));
      io.to(room).emit('room:presence', { members });
    }
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'websocket-service' }));
app.get('/stats', async (_, res) => {
  const sockets = await io.fetchSockets();
  res.json({ connectedClients: sockets.length });
});

async function bootstrap() {
  await pubClient.ping();
  try {
    await producer.connect();
    console.log('[websocket-service] Kafka producer connected');
  } catch (err) {
    console.warn('[websocket-service] Kafka unavailable, continuing without it');
  }
  httpServer.listen(PORT, () => console.log(`[websocket-service] running on port ${PORT}`));
}

bootstrap().catch(console.error);
