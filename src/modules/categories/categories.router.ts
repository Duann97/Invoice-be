import { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";

import { CategoriesController } from "./categories.controller.js";
import { CreateCategoryDTO } from "./dto/create-category.dto.js";
import { UpdateCategoryDTO } from "./dto/update-category.dto.js";
import { GetCategoriesDTO } from "./dto/get-categories.dto.js";

export class CategoriesRouter {
  private router: Router;

  constructor(
    private categoriesController: CategoriesController,
    private validationMiddleware: ValidationMiddleware,
    private jwtMiddleware: JwtMiddleware,
  ) {
    this.router = Router();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // protect all routes
    this.router.use(this.jwtMiddleware.verifyToken(JWT_SECRET!));

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateCategoryDTO),
      this.categoriesController.create,
    );

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetCategoriesDTO),
      this.categoriesController.findAll,
    );

    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateCategoryDTO),
      this.categoriesController.update,
    );

    this.router.delete("/:id", this.categoriesController.softDelete);
  };

  getRouter = () => this.router;
}
