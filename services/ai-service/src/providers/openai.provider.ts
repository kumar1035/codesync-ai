import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function complete(prompt: string, systemPrompt: string): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
  });
  return res.choices[0]?.message?.content || '';
}

export async function stream(prompt: string, systemPrompt: string, onChunk: (chunk: string) => void): Promise<string> {
  const stream = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    full += text;
    onChunk(text);
  }
  return full;
}
