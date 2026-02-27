import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies.user_id) {
    const userId = crypto.randomUUID();
    res.cookie('user_id', userId, { httpOnly: true });
    req.cookies.user_id = userId;
  }
  next();
}
