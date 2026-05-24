import * as openai from './openai.provider';
import * as claude from './claude.provider';
import * as gemini from './gemini.provider';

type Provider = { complete: typeof openai.complete; stream: typeof openai.stream };

export function getProvider(): Provider {
  const p = process.env.AI_PROVIDER || 'openai';
  if (p === 'claude') return claude;
  if (p === 'gemini') return gemini;
  return openai;
}
