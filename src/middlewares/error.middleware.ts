import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  req.log?.error?.(err);

  const message = err?.message || "Something went wrong!";
  const status = err?.status || err?.statusCode || 500;

  return res.status(status).json({ message });
};
