import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { roomRouter } from './routes/room.routes';
import { fileRouter } from './routes/file.routes';
import { errorHandler } from './middleware/error.middleware';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { initKafka } from './config/kafka';

const app = express();
const PORT = process.env.PORT || 4002;

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined'));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'collaboration-service' }));
app.use('/rooms', roomRouter);
app.use('/files', fileRouter);
app.use(errorHandler);

async function bootstrap() {
  await connectDB();
  await connectRedis();
  await initKafka();
  app.listen(PORT, () => console.log(`[collaboration-service] running on port ${PORT}`));
}

bootstrap().catch(console.error);
