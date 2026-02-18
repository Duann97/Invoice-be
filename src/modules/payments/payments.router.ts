import { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";

import { PaymentsController } from "./payments.controller.js";
import { CreatePaymentDTO } from "./dto/create-payment.dto.js";
import { ListPaymentsDTO } from "./dto/list-payments.dto.js";

export class PaymentsRouter {
  private router: Router;

  constructor(
    private paymentsController: PaymentsController,
    private validationMiddleware: ValidationMiddleware,
    private jwtMiddleware: JwtMiddleware,
  ) {
    this.router = Router();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.use(this.jwtMiddleware.verifyToken(JWT_SECRET!));

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreatePaymentDTO),
      this.paymentsController.create,
    );

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(ListPaymentsDTO),
      this.paymentsController.list,
    );

    this.router.delete("/:id", this.paymentsController.delete);
  };

  getRouter = () => this.router;
}
