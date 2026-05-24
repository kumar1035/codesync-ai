import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { errorHandler } from './middleware/error.middleware';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initKafkaProducer } from './config/kafka';

const app = express();
const PORT = process.env.PORT || 4001;

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'auth-service', ts: Date.now() }));

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use(errorHandler);

async function bootstrap() {
  // DB is required — fail fast if unreachable
  await connectDB();

  // Redis and Kafka are optional — service starts even if unavailable
  await connectRedis();
  await initKafkaProducer();

  app.listen(PORT, () => console.log(`[auth-service] running on port ${PORT}`));
}

bootstrap().catch((err) => {
  console.error('[auth-service] Fatal startup error:', err.message);
  console.error('Check your DATABASE_URL in .env — Supabase project may be paused.');
  process.exit(1);
});
