import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { fail } from "../lib/response";

export interface AuthPayload {
  sub: string;
  role: string;
  farmerId?: string;
  adminId?: string;
  udlrn?: string;
  state?: string;
  email?: string;
  jurisdiction?: Record<string, unknown>;
  cscId?: string;
  insurerCode?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    fail(res, "Authentication required", 401, "UNAUTHENTICATED");
    return;
  }
  const token = header.slice(7);
  try {
    req.auth = verifyAccessToken(token) as AuthPayload;
    next();
  } catch {
    fail(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      fail(res, "Authentication required", 401, "UNAUTHENTICATED");
      return;
    }
    if (!roles.includes(req.auth.role)) {
      fail(res, "Insufficient permissions", 403, "FORBIDDEN");
      return;
    }
    next();
  };
}

export function requireFarmer(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "FARMER") {
      fail(res, "Farmer access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

export function requireCscOperator(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "CSC_OPERATOR") {
      fail(res, "CSC Operator access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

export function requireFieldOfficer(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "FIELD_OFFICER") {
      fail(res, "Field Officer access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

export function requireInsurer(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== "INSURER") {
      fail(res, "Insurer access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const adminRoles = ["ADMIN", "SYSOP"];
    if (!req.auth || !adminRoles.includes(req.auth.role)) {
      fail(res, "Admin access only", 403, "FORBIDDEN");
      return;
    }
    next();
  });
}

export function requireAnyRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      if (!req.auth || !roles.includes(req.auth.role)) {
        fail(res, "Insufficient permissions", 403, "FORBIDDEN");
        return;
      }
      next();
    });
  };
}
