import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  userName?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET not configured" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string; name: string };
    req.userId = payload.userId;
    req.userName = payload.name;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
