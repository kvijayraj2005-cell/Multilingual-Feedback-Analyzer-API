import dotenv from 'dotenv';

dotenv.config();

function mustGet(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: mustGet('DATABASE_URL'),
  JWT_SECRET: mustGet('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GEMINI_API_KEY: mustGet('GEMINI_API_KEY'),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;
