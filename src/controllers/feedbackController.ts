import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { SubmitFeedbackSchema, BatchFeedbackSchema, CreateProjectSchema } from '../validators/feedbackValidator';
import { analyzeText } from '../services/geminiService';
import { parseUpload } from '../services/uploadService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

async function runAnalysis(feedbackId: string, text: string): Promise<void> {
  const result = await analyzeText(text);
  await prisma.$transaction([
    prisma.analysis.create({
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
    }),
    prisma.feedback.update({ where: { id: feedbackId }, data: { status: 'completed' } }),
  ]);
}

export const createProject = catchAsync<AuthRequest>(async (req, res: Response): Promise<void> => {
  const { name, description } = CreateProjectSchema.parse(req.body);
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const project = await prisma.project.create({ data: { name, description, slug, userId: req.userId! } });
  console.log('[createProject] -> Created project:', project.id);
  res.status(201).json({ success: true, data: project });
});

export const listProjects = catchAsync<AuthRequest>(async (req, res: Response): Promise<void> => {
  const projects = await prisma.project.findMany({
    where: { userId: req.userId },
    include: { _count: { select: { feedbacks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: projects });
});

export const submitFeedback = catchAsync<AuthRequest>(async (req, res: Response): Promise<void> => {
  const { projectId, text, source } = SubmitFeedbackSchema.parse(req.body);

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
  if (!project) throw new AppError('Project not found', 404);

  const feedback = await prisma.feedback.create({ data: { rawText: text, charCount: text.length, source: source ?? 'api', status: 'pending', projectId } });
  console.log('[submitFeedback] -> Running analysis for feedbackId:', feedback.id);
  await runAnalysis(feedback.id, text);

  const full = await prisma.feedback.findUnique({ where: { id: feedback.id }, include: { analysis: true } });
  res.status(201).json({ success: true, data: full });
});

export const batchFeedback = catchAsync<AuthRequest>(async (req, res: Response): Promise<void> => {
  const { projectId, items } = BatchFeedbackSchema.parse(req.body);

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
  if (!project) throw new AppError('Project not found', 404);

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const feedback = await prisma.feedback.create({ data: { rawText: item.text, charCount: item.text.length, source: item.source ?? 'batch_api', status: 'pending', projectId } });
      await runAnalysis(feedback.id, item.text);
      return feedback.id;
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log('[batchFeedback] -> Completed. succeeded:', succeeded, 'failed:', failed);
  res.status(201).json({ success: true, data: { processed: succeeded, failed } });
});

export const uploadFeedback = catchAsync<AuthRequest>(async (req, res: Response): Promise<void> => {
  const projectId = req.body.projectId as string;
  if (!projectId) throw new AppError('projectId is required', 400);
  if (!req.file) throw new AppError('No file uploaded', 400);

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId } });
  if (!project) throw new AppError('Project not found', 404);

  const rows = parseUpload(req.file.buffer, req.file.mimetype);
  console.log('[uploadFeedback] -> Parsed rows:', rows.length);

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      const mimeSource = req.file!.mimetype === 'text/csv' ? 'csv_upload' : 'excel_upload';
      const feedback = await prisma.feedback.create({ data: { rawText: row.text, charCount: row.text.length, source: mimeSource, status: 'pending', projectId } });
      await runAnalysis(feedback.id, row.text);
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  console.log('[uploadFeedback] -> Completed. processed:', succeeded, 'of', rows.length);
  res.status(201).json({ success: true, data: { totalRows: rows.length, processed: succeeded } });
});
