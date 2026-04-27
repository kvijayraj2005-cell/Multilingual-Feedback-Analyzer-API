import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SubmitFeedbackSchema, BatchFeedbackSchema, CreateProjectSchema } from '../validators/feedbackValidator';
import { analyzeText } from '../services/geminiService';
import { parseUpload } from '../services/uploadService';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

async function runAnalysis(feedbackId: string, text: string): Promise<void> {
  const result = await analyzeText(text);
  await prisma.analysis.create({
    data: {
      feedbackId,
      detectedLang: result.detected_language,
      script: result.script,
      sentiment: result.sentiment,
      confidence: result.sentiment_confidence,
      themes: result.themes,
      isSarcastic: result.is_sarcastic,
      containsCodeMix: result.contains_code_mix,
      rationale: result.rationale,
      modelUsed: result.modelUsed,
    },
  });
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description } = CreateProjectSchema.parse(req.body);
    const project = await prisma.project.create({ data: { name, description, userId: req.userId! } });
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function listProjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { feedbacks: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

export async function submitFeedback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, text, source } = SubmitFeedbackSchema.parse(req.body);
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const feedback = await prisma.feedback.create({ data: { rawText: text, source: source ?? 'api', projectId } });
    logger.debug('submitFeedback', 'Running analysis', { feedbackId: feedback.id });
    await runAnalysis(feedback.id, text);

    const full = await prisma.feedback.findUnique({ where: { id: feedback.id }, include: { analysis: true } });
    res.status(201).json({ success: true, data: full });
  } catch (err) { next(err); }
}

export async function batchFeedback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, items } = BatchFeedbackSchema.parse(req.body);
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const feedback = await prisma.feedback.create({ data: { rawText: item.text, source: item.source ?? 'api', projectId } });
        await runAnalysis(feedback.id, item.text);
        return feedback.id;
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    logger.info('batchFeedback', 'Batch complete', { succeeded, failed });
    res.status(201).json({ success: true, data: { processed: succeeded, failed } });
  } catch (err) { next(err); }
}

export async function uploadFeedback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.body.projectId as string;
    if (!projectId) { res.status(400).json({ success: false, error: 'projectId is required' }); return; }
    if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const rows = parseUpload(req.file.buffer, req.file.mimetype);
    logger.info('uploadFeedback', 'Parsed rows', { count: rows.length });

    const results = await Promise.allSettled(
      rows.map(async (row) => {
        const feedback = await prisma.feedback.create({ data: { rawText: row.text, source: 'upload', projectId } });
        await runAnalysis(feedback.id, row.text);
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    res.status(201).json({ success: true, data: { totalRows: rows.length, processed: succeeded } });
  } catch (err) { next(err); }
}
