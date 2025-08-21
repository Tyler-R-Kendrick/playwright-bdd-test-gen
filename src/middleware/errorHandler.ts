import { Request, Response, NextFunction } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  let status = 500;
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const maybe = (err as Record<string, unknown>).status;
    if (typeof maybe === 'number') status = maybe;
  }
  res.status(status).json({ error: getErrorMessage(err) || 'Internal Server Error' });
}
