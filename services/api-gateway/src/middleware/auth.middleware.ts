import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function verifyTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  try {
    jwt.verify(header.slice(7), process.env.JWT_SECRET!);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
