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
import { getProvider } from './providers';
import { SYSTEM_PROMPTS } from './prompts/system.prompts';

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false });

const kafka = new Kafka({ clientId: 'ai-service', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'], logLevel: logLevel.WARN });
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

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'AI rate limit exceeded' } });

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'ai-service', provider: process.env.AI_PROVIDER }));

async function handleAI(
  req: AuthRequest, res: Response,
  interactionType: keyof typeof SYSTEM_PROMPTS,
  buildPrompt: (body: any) => string
) {
  const { stream: useStream = false, roomId } = req.body;
  const prompt = buildPrompt(req.body);
  const provider = getProvider();
  const systemPrompt = SYSTEM_PROMPTS[interactionType];
  const startTime = Date.now();

  let response = '';

  if (useStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    response = await provider.stream(prompt, systemPrompt, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } else {
    response = await provider.complete(prompt, systemPrompt);
    res.json({ success: true, data: { response } });
  }

  const latency = Date.now() - startTime;

  // Fire-and-forget — don't let DB/Kafka failures crash the request
  pool.query(
    'INSERT INTO ai_interactions (id, user_id, room_id, interaction_type, prompt, response, provider, latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [uuidv4(), req.user!.userId, roomId, interactionType, prompt, response, process.env.AI_PROVIDER, latency]
  ).catch(() => {});

  producer.send({
    topic: 'ai-events',
    messages: [{ key: req.user!.userId, value: JSON.stringify({ type: 'ai_interaction', interactionType, userId: req.user!.userId, latency, ts: Date.now() }) }]
  }).catch(() => {});
}

function aiRoute(
  interactionType: keyof typeof SYSTEM_PROMPTS,
  buildPrompt: (body: any) => string
) {
  return (req: AuthRequest, res: Response) => {
    handleAI(req as any, res, interactionType, buildPrompt).catch((err: any) => {
      console.error(`[ai-service] ${interactionType} error:`, err?.message || err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'AI request failed' });
      }
    });
  };
}

app.post('/ai/complete',  authenticate, aiLimiter, aiRoute('completion',    ({ code, language }) => `Language: ${language}\n\nCode:\n${code}`));
app.post('/ai/review',    authenticate, aiLimiter, aiRoute('review',        ({ code, language }) => `Language: ${language}\n\nCode to review:\n${code}`));
app.post('/ai/debug',     authenticate, aiLimiter, aiRoute('debug',         ({ code, error, language }) => `Language: ${language}\n\nCode:\n${code}\n\nError:\n${error}`));
app.post('/ai/explain',   authenticate, aiLimiter, aiRoute('explain',       ({ code, language }) => `Language: ${language}\n\nCode:\n${code}`));
app.post('/ai/refactor',  authenticate, aiLimiter, aiRoute('refactor',      ({ code, language, instructions }) => `Language: ${language}\n\nInstructions: ${instructions || 'Improve code quality'}\n\nCode:\n${code}`));
app.post('/ai/chat',      authenticate, aiLimiter, aiRoute('chat',          ({ message, context }) => context ? `Context:\n${context}\n\nQuestion: ${message}` : message));
app.post('/ai/docs',      authenticate, aiLimiter, aiRoute('documentation', ({ code, language }) => `Language: ${language}\n\nCode:\n${code}`));
app.post('/ai/generate',  authenticate, aiLimiter, aiRoute('generate',      ({ message }) => message));

app.get('/ai/history', authenticate, async (req: AuthRequest, res) => {
  const rows = await pool.query(
    'SELECT id, interaction_type, prompt, response, provider, latency_ms, created_at FROM ai_interactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user!.userId]
  );
  res.json({ success: true, data: rows.rows });
});

async function bootstrap() {
  try {
    await producer.connect();
    console.log('[ai-service] Kafka producer connected');
  } catch {
    console.warn('[ai-service] Kafka unavailable, events will be skipped');
  }
  app.listen(PORT, () => console.log(`[ai-service] running on port ${PORT}`));
}

bootstrap().catch(console.error);
