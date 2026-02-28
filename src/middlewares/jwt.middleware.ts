import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import jwt from "jsonwebtoken";

export class JwtMiddleware {
  verifyToken = (secretKey?: string) => {
    if (!secretKey) {
      throw new ApiError("JWT_SECRET is not set", 500);
    }

    return (req: Request, res: Response, next: NextFunction) => {
      const auth = req.headers.authorization;
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

      if (!token) throw new ApiError("No token provided", 401);

      try {
        const payload = jwt.verify(token, secretKey);

        res.locals.user = payload;

        return next();
      } catch (e) {
        throw new ApiError("Invalid token or expired token", 401);
      }
    };
  };
}
