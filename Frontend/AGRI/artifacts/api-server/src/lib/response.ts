import { v4 as uuidv4 } from "uuid";
import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
  });
}

export function fail(res: Response, message: string, status = 400, code?: string) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { message, code: code ?? "ERROR" },
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
  });
}
