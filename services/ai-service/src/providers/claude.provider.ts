import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  return client;
}

export async function complete(prompt: string, systemPrompt: string): Promise<string> {
  const res = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

export async function stream(prompt: string, systemPrompt: string, onChunk: (chunk: string) => void): Promise<string> {
  let full = '';
  const s = await getClient().messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of s) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      full += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return full;
}
