import { Kafka, Producer, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
  retry: { initialRetryTime: 300, retries: 3 },
});

export let producer: Producer | null = null;

export async function initKafkaProducer() {
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('[auth-service] Kafka producer connected');
  } catch (err) {
    console.warn('[auth-service] Kafka unavailable — events will be skipped:', (err as Error).message);
    producer = null;
  }
}

export async function publishEvent(topic: string, key: string, value: object) {
  if (!producer) return; // Kafka optional — skip silently
  try {
    await producer.send({ topic, messages: [{ key, value: JSON.stringify(value) }] });
  } catch (err) {
    console.warn('[auth-service] Failed to publish event:', (err as Error).message);
  }
}
