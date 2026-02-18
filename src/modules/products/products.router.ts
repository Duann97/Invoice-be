import { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";

import { ProductsController } from "./products.controller.js";
import { CreateProductDTO } from "./dto/create-product.dto.js";
import { UpdateProductDTO } from "./dto/update-product.dto.js";
import { GetProductsDTO } from "./dto/get-products.dto.js";

export class ProductsRouter {
  private router: Router;

  constructor(
    private productsController: ProductsController,
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
      this.validationMiddleware.validateBody(CreateProductDTO),
      this.productsController.create,
    );

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetProductsDTO),
      this.productsController.findAll,
    );

    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateProductDTO),
      this.productsController.update,
    );

    this.router.delete("/:id", this.productsController.softDelete);
  };

  getRouter = () => this.router;
}
