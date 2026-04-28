import type { Request, Response, NextFunction } from 'express';

type AsyncHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function catchAsync<Req extends Request = Request>(fn: AsyncHandler<Req>): AsyncHandler<Req> {
  return (req, res, next): Promise<void> => fn(req, res, next).catch(next);
}
