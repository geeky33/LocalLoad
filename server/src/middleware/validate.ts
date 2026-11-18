import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

/** Runs after express-validator chains and returns 400 with the first message. */
export function validate(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array();
  res.status(400).json({ error: errors[0].msg, errors: errors.map((e) => e.msg) });
}
