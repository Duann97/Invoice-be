import { Router } from "express";
import { RecurringController } from "./recurring.controller.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";

import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { UpdateRecurringDTO } from "./dto/update-recurring.dto.js";

export class RecurringRouter {
  private router: Router;

  constructor(
    private recurringController: RecurringController,
    private validationMiddleware: ValidationMiddleware,
    private jwtMiddleware: JwtMiddleware,
  ) {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes() {
    // ✅ biar kompatibel walau nama method jwt middleware beda-beda
    const auth =
      (this.jwtMiddleware as any).verifyToken ||
      (this.jwtMiddleware as any).use ||
      (this.jwtMiddleware as any).handle ||
      ((req: any, _res: any, next: any) => next());

    const validateBody =
      (this.validationMiddleware as any).validateBody ||
      (this.validationMiddleware as any).validate ||
      ((_: any) => (req: any, _res: any, next: any) => next());

    this.router.use(auth.bind(this.jwtMiddleware));

    this.router.get("/", this.recurringController.list);
    this.router.post(
      "/",
      validateBody(CreateRecurringDTO),
      this.recurringController.create,
    );

    this.router.patch(
      "/:id",
      validateBody(UpdateRecurringDTO),
      this.recurringController.update,
    );

    this.router.patch("/:id/toggle", this.recurringController.toggle);
  }

  getRouter() {
    return this.router;
  }
}
