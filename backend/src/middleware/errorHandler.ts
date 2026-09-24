import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "بيانات غير صحيحة", errors: err.flatten() });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);

  // Never leak internal error text (SQL, stack traces) to clients in production.
  const message = env.isProd
    ? "حصل خطأ في السيرفر"
    : err instanceof Error
      ? err.message
      : "حصل خطأ في السيرفر";

  return res.status(500).json({ message });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "المسار غير موجود" });
}
