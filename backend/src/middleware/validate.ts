import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'issues' in err
          ? (err as { issues: { message: string }[] }).issues.map((i) => i.message).join(' ')
          : 'Invalid request.';
      next(AppError.badRequest(message));
    }
  };
}
