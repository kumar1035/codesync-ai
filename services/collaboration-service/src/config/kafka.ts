import { Kafka, Producer, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'collaboration-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
  retry: { initialRetryTime: 300, retries: 3 },
});

export let producer: Producer | null = null;

export async function initKafka() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('[collaboration-service] Kafka producer connected');
  } catch (err) {
    console.warn('[collaboration-service] Kafka unavailable — events will be skipped:', (err as Error).message);
    producer = null;
  }
}

export async function publishEvent(topic: string, key: string, value: object) {
  if (!producer) return;
  try {
    await producer.send({ topic, messages: [{ key, value: JSON.stringify(value) }] });
  } catch (err) {
    console.warn('[collaboration-service] Event publish failed:', (err as Error).message);
  }
}
