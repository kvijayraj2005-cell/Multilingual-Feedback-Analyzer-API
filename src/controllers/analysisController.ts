import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { buildReport } from '../services/reportService';
import { aggregateThemes } from '../services/themeService';
import { buildPdfBuffer } from '../utils/pdfExport';
import { prisma } from '../lib/prisma';

export async function getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const report = await buildReport(projectId, req.userId!);
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
}

export async function getSentiment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const rows = await prisma.analysis.findMany({
      where: { feedback: { projectId } },
      select: { sentiment: true, confidence: true },
    });

    const breakdown: Record<string, { count: number; avgConfidence: number }> = {};
    const countMap: Record<string, number> = {};
    const confSum: Record<string, number> = {};

    for (const r of rows) {
      countMap[r.sentiment] = (countMap[r.sentiment] ?? 0) + 1;
      confSum[r.sentiment] = (confSum[r.sentiment] ?? 0) + r.confidence;
    }
    for (const sentiment of Object.keys(countMap)) {
      breakdown[sentiment] = {
        count: countMap[sentiment]!,
        avgConfidence: parseFloat(((confSum[sentiment] ?? 0) / countMap[sentiment]!).toFixed(3)),
      };
    }

    res.json({ success: true, data: { projectId, breakdown } });
  } catch (err) { next(err); }
}

export async function getThemes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const analyses = await prisma.analysis.findMany({
      where: { feedback: { projectId } },
      select: { themes: true, confidence: true, sentiment: true },
    });

    const themes = aggregateThemes(analyses);
    res.json({ success: true, data: { projectId, themes } });
  } catch (err) { next(err); }
}

export async function exportReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const format = Array.isArray(req.query['format']) ? req.query['format'][0] : (req.query['format'] as string | undefined) ?? 'json';
    const report = await buildReport(projectId, req.userId!);

    if (format === 'pdf') {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      const buf = await buildPdfBuffer({
        projectName: project?.name ?? 'Unknown',
        totalFeedback: report.totalFeedback,
        sentimentBreakdown: report.sentimentBreakdown,
        languageBreakdown: report.languageBreakdown,
        topThemes: report.topThemes,
        priorityAlerts: report.priorityAlerts,
        trendDirection: report.trendDirection,
        generatedAt: new Date().toISOString(),
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report-${projectId}.pdf"`);
      res.send(buf);
    } else {
      res.json({ success: true, data: report });
    }
  } catch (err) { next(err); }
}
