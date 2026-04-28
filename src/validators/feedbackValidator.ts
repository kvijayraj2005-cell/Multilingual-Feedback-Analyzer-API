import { z } from 'zod';

export const SubmitFeedbackSchema = z.object({
  projectId: z.string().uuid(),
  text: z.string().min(1).max(5000),
  source: z.enum(['api', 'batch_api', 'manual']).optional(),
});

export const BatchFeedbackSchema = z.object({
  projectId: z.string().uuid(),
  items: z
    .array(
      z.object({
        text: z.string().min(1).max(5000),
        source: z.enum(['api', 'batch_api', 'manual']).optional(),
      })
    )
    .min(1)
    .max(100),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
export type BatchFeedbackInput = z.infer<typeof BatchFeedbackSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
