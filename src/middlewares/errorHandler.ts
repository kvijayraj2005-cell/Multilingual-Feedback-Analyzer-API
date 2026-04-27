import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: 'Validation error', details: err.flatten() });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error('errorHandler', message, err instanceof Error ? err.stack : err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
