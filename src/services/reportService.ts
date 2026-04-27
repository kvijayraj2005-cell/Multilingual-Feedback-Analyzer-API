import { PrismaClient } from '@prisma/client';
import { aggregateThemes } from './themeService';
import { sentimentScore, averageSentimentLabel } from './sentimentService';

const prisma = new PrismaClient();

export interface AggregateReport {
  projectId: string;
  totalFeedback: number;
  sentimentBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  topThemes: Array<{ theme: string; count: number; avgSentiment: number }>;
  priorityAlerts: number;
  trendDirection: string;
}

export async function buildReport(projectId: string, userId: string): Promise<AggregateReport> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error('Project not found');

  const analyses = await prisma.analysis.findMany({
    where: { feedback: { projectId } },
    select: {
      sentiment: true,
      confidence: true,
      detectedLang: true,
      themes: true,
      isSarcastic: true,
    },
  });

  const total = analyses.length;

  const sentimentBreakdown: Record<string, number> = {};
  const languageBreakdown: Record<string, number> = {};

  for (const a of analyses) {
    sentimentBreakdown[a.sentiment] = (sentimentBreakdown[a.sentiment] ?? 0) + 1;
    languageBreakdown[a.detectedLang] = (languageBreakdown[a.detectedLang] ?? 0) + 1;
  }

  const topThemes = aggregateThemes(
    analyses.map((a) => ({ themes: a.themes, confidence: a.confidence, sentiment: a.sentiment }))
  ).slice(0, 10);

  const priorityAlerts = analyses.filter(
    (a) => a.sentiment === 'negative' && a.confidence > 0.8
  ).length;

  const recentScores = analyses
    .slice(-50)
    .map((a) => sentimentScore(a.sentiment as 'positive' | 'negative' | 'neutral' | 'mixed', a.confidence));
  const olderScores = analyses
    .slice(0, Math.max(0, analyses.length - 50))
    .map((a) => sentimentScore(a.sentiment as 'positive' | 'negative' | 'neutral' | 'mixed', a.confidence));

  const recentAvg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
  const olderAvg = olderScores.length ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;
  const trendDirection = total < 10 ? 'insufficient data' : recentAvg > olderAvg ? 'improving' : 'declining';

  return { projectId, totalFeedback: total, sentimentBreakdown, languageBreakdown, topThemes, priorityAlerts, trendDirection };
}
