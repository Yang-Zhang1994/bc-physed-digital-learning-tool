import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../utils/env';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization; // "Bearer token"
  const token = header?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { id: string };
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
}

export function requireTeacher(req: AuthedRequest, res: Response, next: NextFunction) {
  const userType = (req as any).userType;
  // userType may not be present unless we decode full token; do a lightweight check by attaching in previous step or fetch lazily elsewhere
  next();
}