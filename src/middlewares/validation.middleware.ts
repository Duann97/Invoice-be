import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

export class ValidationMiddleware {
  validateBody<T>(dtoClass: new () => T) {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        if (!req.body)
          return next(new ApiError("Request body is required", 400));

        const dtoInstance = plainToInstance(dtoClass, req.body, {
          enableImplicitConversion: true,
        });

        const errors = await validate(dtoInstance as any);
        if (errors.length > 0) {
          const message = errors
            .map((error) => Object.values(error.constraints || {}))
            .flat()
            .join(", ");
          return next(new ApiError(message, 400));
        }

        req.body = dtoInstance;
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }

  validateQuery<T>(dtoClass: new () => T) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const dtoInstance = plainToInstance(dtoClass, req.query, {
          enableImplicitConversion: true, // ✅ kunci biar "100" -> 100
        });

        const errors = await validate(dtoInstance as any);
        if (errors.length > 0) {
          const message = errors
            .map((error) => Object.values(error.constraints || {}))
            .flat()
            .join(", ");
          return next(new ApiError(message, 400));
        }

        res.locals.query = dtoInstance;
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }
}
