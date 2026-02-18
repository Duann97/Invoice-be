import { Router } from "express";
import { InvoicesController } from "./invoices.controller.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";

import { CreateInvoiceDTO } from "./dto/create-invoice.dto.js";
import { UpdateInvoiceDTO } from "./dto/update-invoice.dto.js";
import { UpdateInvoiceStatusDTO } from "./dto/update-invoice-status.dto.js";
import { ListInvoicesDTO } from "./dto/list-invoices.dto.js";
import { JWT_SECRET } from "../../config/env.js";

export class InvoicesRouter {
  private router: Router;

  constructor(
    private controller: InvoicesController,
    private validation: ValidationMiddleware,
    private jwt: JwtMiddleware,
  ) {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(this.jwt.verifyToken(JWT_SECRET!));

    this.router.post(
      "/",
      this.validation.validateBody(CreateInvoiceDTO),
      this.controller.create,
    );

    this.router.get(
      "/",
      this.validation.validateQuery(ListInvoicesDTO),
      this.controller.list,
    );

    this.router.get("/:id", this.controller.detail);

    this.router.patch(
      "/:id",
      this.validation.validateBody(UpdateInvoiceDTO),
      this.controller.update,
    );

    this.router.patch(
      "/:id/status",
      this.validation.validateBody(UpdateInvoiceStatusDTO),
      this.controller.updateStatus,
    );
    this.router.patch("/:id/cancel", this.controller.cancel);

    this.router.post("/:id/send", this.controller.send);

    this.router.delete("/:id", this.controller.cancel);
  }

  getRouter() {
    return this.router;
  }
}
