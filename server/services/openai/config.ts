import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined,
});

export const OPENAI_CONFIG = {
  WHISPER_MODEL: 'whisper-1',
  GPT_MODEL: 'gpt-4-turbo-preview',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
} as const;