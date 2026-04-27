export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export function sentimentScore(sentiment: Sentiment, confidence: number): number {
  const base: Record<Sentiment, number> = {
    positive: 1,
    negative: -1,
    neutral: 0,
    mixed: 0,
  };
  return base[sentiment] * confidence;
}

export function averageSentimentLabel(scores: number[]): Sentiment {
  if (scores.length === 0) return 'neutral';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg > 0.3) return 'positive';
  if (avg < -0.3) return 'negative';
  return 'neutral';
}
