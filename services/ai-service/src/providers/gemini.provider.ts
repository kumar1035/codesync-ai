import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI;
}

const MODEL = 'gemini-2.0-flash';
const REQUEST_OPTIONS = { apiVersion: 'v1beta' };

export async function complete(prompt: string, systemPrompt: string): Promise<string> {
  const model = getClient().getGenerativeModel(
    { model: MODEL, systemInstruction: systemPrompt },
    REQUEST_OPTIONS
  );
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function stream(prompt: string, systemPrompt: string, onChunk: (chunk: string) => void): Promise<string> {
  const model = getClient().getGenerativeModel(
    { model: MODEL, systemInstruction: systemPrompt },
    REQUEST_OPTIONS
  );
  const result = await model.generateContentStream(prompt);
  let full = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    full += text;
    onChunk(text);
  }
  return full;
}
