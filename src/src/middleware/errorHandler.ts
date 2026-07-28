import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
};
