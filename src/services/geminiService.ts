import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const FeedbackAnalysisSchema = z.object({
  detected_language: z.enum(['tamil', 'sinhala', 'english', 'tanglish', 'singlish', 'mixed_other', 'unknown']),
  script: z.enum(['tamil_native', 'sinhala_native', 'latin', 'mixed']),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  sentiment_confidence: z.number().min(0).max(1),
  themes: z.array(z.enum(['service', 'price', 'quality', 'delivery', 'staff', 'food', 'app_ux', 'billing', 'other'])),
  is_sarcastic: z.boolean(),
  contains_code_mix: z.boolean(),
  rationale: z.string(),
});

export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>;

const SYSTEM_PROMPT = `You are a multilingual feedback analyzer for Sri Lankan businesses.
Rules:
1. Do NOT translate the input. Classify holistically.
2. If the text mixes Tamil/Sinhala with English (in any script), set contains_code_mix = true.
3. If irony or sarcasm flips polarity, set is_sarcastic = true and report the INTENDED sentiment, not the surface sentiment.
4. Sentiment values:
   - positive: clear approval or satisfaction
   - negative: clear complaint or dissatisfaction
   - neutral: factual statements without emotion
   - mixed: contains both positive and negative
5. Output JSON matching the provided schema. No prose outside JSON.`;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    detected_language: {
      type: SchemaType.STRING,
      enum: ['tamil', 'sinhala', 'english', 'tanglish', 'singlish', 'mixed_other', 'unknown'],
    },
    script: {
      type: SchemaType.STRING,
      enum: ['tamil_native', 'sinhala_native', 'latin', 'mixed'],
    },
    sentiment: {
      type: SchemaType.STRING,
      enum: ['positive', 'negative', 'neutral', 'mixed'],
    },
    sentiment_confidence: { type: SchemaType.NUMBER },
    themes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        enum: ['service', 'price', 'quality', 'delivery', 'staff', 'food', 'app_ux', 'billing', 'other'],
      },
    },
    is_sarcastic: { type: SchemaType.BOOLEAN },
    contains_code_mix: { type: SchemaType.BOOLEAN },
    rationale: { type: SchemaType.STRING },
  },
  required: [
    'detected_language',
    'script',
    'sentiment',
    'sentiment_confidence',
    'themes',
    'is_sarcastic',
    'contains_code_mix',
    'rationale',
  ],
};

async function callModel(modelName: string, text: string): Promise<FeedbackAnalysis> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
  const result = await model.generateContent(text);
  const raw = result.response.text();
  return FeedbackAnalysisSchema.parse(JSON.parse(raw));
}

export async function analyzeText(text: string): Promise<FeedbackAnalysis & { modelUsed: string }> {
  const fn = 'analyzeText';
  let modelUsed = env.GEMINI_MODEL;

  try {
    logger.debug(fn, 'Calling Gemini', { model: modelUsed, len: text.length });
    const result = await callModel(modelUsed, text);

    if (result.sentiment_confidence < 0.6) {
      logger.info(fn, 'Low confidence — retrying with Pro', { confidence: result.sentiment_confidence });
      try {
        modelUsed = 'gemini-2.5-pro';
        const retried = await callModel(modelUsed, text);
        return { ...retried, modelUsed };
      } catch (proErr) {
        logger.warn(fn, 'Pro retry failed, using Flash result', { error: String(proErr) });
        return { ...result, modelUsed: env.GEMINI_MODEL };
      }
    }

    return { ...result, modelUsed };
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      logger.warn(fn, 'Rate limited — falling back to Flash-Lite');
      modelUsed = 'gemini-2.5-flash-lite';
      const result = await callModel(modelUsed, text);
      return { ...result, modelUsed };
    }
    throw err;
  }
}
