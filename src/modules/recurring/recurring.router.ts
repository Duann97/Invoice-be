import { Router } from "express";
import { JWT_SECRET } from "../../config/env.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { RecurringController } from "./recurring.controller.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { GetRecurringDTO } from "./dto/get-recurring.dto.js";
import { UpdateRecurringDTO } from "./dto/update-recurring.dto.js";
import { RunRecurringDTO } from "./dto/run-recurring.dto.js";

export class RecurringRouter {
  private router: Router;

  constructor(
    private recurringController: RecurringController,
    private validationMiddleware: ValidationMiddleware,
    private jwtMiddleware: JwtMiddleware,
  ) {
    this.router = Router();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.use(this.jwtMiddleware.verifyToken(JWT_SECRET!));

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetRecurringDTO),
      this.recurringController.list,
    );

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateRecurringDTO),
      this.recurringController.create,
    );

    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateRecurringDTO),
      this.recurringController.update,
    );

    // manual trigger for testing
    this.router.post(
      "/run",
      this.validationMiddleware.validateBody(RunRecurringDTO),
      this.recurringController.run,
    );
  };

  getRouter = () => this.router;
}
