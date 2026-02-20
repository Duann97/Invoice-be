import { Router } from "express";
import { RecurringController } from "./recurring.controller.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { ToggleRecurringDTO } from "./dto/toggle-recurring.dto.js";

export class RecurringRouter {
  private router: Router;

  constructor(
    private controller: RecurringController,
    private validation: ValidationMiddleware,
    private jwt: JwtMiddleware,
  ) {
    this.router = Router();
    this.init();
  }

  private init() {
    this.router.use(this.jwt.verifyToken);

    this.router.get("/", this.controller.list);
    this.router.post(
      "/",
      this.validation.validateBody(CreateRecurringDTO),
      this.controller.create,
    );
    this.router.patch(
      "/:id/toggle",
      this.validation.validateBody(ToggleRecurringDTO),
      this.controller.toggle,
    );
  }

  getRouter() {
    return this.router;
  }
}
