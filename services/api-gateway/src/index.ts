import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { verifyTokenMiddleware } from './middleware/auth.middleware';

const app = express();
const PORT = process.env.PORT || 4000;

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, enableReadyCheck: false });
redis.on('error', (err) => console.warn('[api-gateway] Redis error:', err.message));

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(morgan('combined'));
// Do NOT add express.json() here — it would consume the body stream
// before http-proxy-middleware can forward it to downstream services.

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' },
});
app.use(globalLimiter);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'api-gateway', ts: Date.now() }));

// Auth service (public)
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
}));

// Protected routes
app.use('/api/users', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
}));

app.use('/api/rooms', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.COLLABORATION_SERVICE_URL || 'http://collaboration-service:4002',
  changeOrigin: true,
  pathRewrite: { '^/api/rooms': '/rooms' },
}));

app.use('/api/files', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.COLLABORATION_SERVICE_URL || 'http://collaboration-service:4002',
  changeOrigin: true,
  pathRewrite: { '^/api/files': '/files' },
}));

app.use('/api/ai', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.AI_SERVICE_URL || 'http://ai-service:4004',
  changeOrigin: true,
  pathRewrite: { '^/api/ai': '/ai' },
  proxyTimeout: 120000,
  timeout: 120000,
}));

app.use('/api/execute', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.EXECUTION_SERVICE_URL || 'http://execution-service:4005',
  changeOrigin: true,
  pathRewrite: { '^/api/execute': '/execute' },
}));

app.use('/api/analytics', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:4006',
  changeOrigin: true,
  pathRewrite: { '^/api/analytics': '/analytics' },
}));

app.use('/api/history', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.HISTORY_SERVICE_URL || 'http://history-service:4008',
  changeOrigin: true,
  pathRewrite: { '^/api/history': '/history' },
}));

app.use('/api/notifications', verifyTokenMiddleware, createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4007',
  changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
}));

app.listen(PORT, () => console.log(`[api-gateway] running on port ${PORT}`));
