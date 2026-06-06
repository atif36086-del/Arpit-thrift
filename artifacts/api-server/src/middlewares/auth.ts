import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid authorization header");
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ error }, "Invalid or expired token");
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      id: user.id,
      email: user.email || "",
      role: user.user_metadata?.role || "user",
    };

    next();
  } catch (err) {
    logger.error({ err }, "Authentication error");
    res.status(500).json({ error: "Authentication failed" });
  }
};

export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role !== "admin") {
      logger.warn({ userId: req.user.id }, "Unauthorized admin access attempt");
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (err) {
    logger.error({ err }, "Admin authorization error");
    res.status(500).json({ error: "Authorization failed" });
  }
};
