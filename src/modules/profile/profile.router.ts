import { Router } from "express";
import multer from "multer";

import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";
import { ProfileController } from "./profile.controller.js";

export class ProfileRouter {
  private router: Router;

  private upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  constructor(
    private profileController: ProfileController,
    private validationMiddleware: ValidationMiddleware,
    private jwtMiddleware: JwtMiddleware,
  ) {
    this.router = Router();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.use(this.jwtMiddleware.verifyToken(JWT_SECRET!));

    this.router.get("/", this.profileController.getProfile);

    this.router.patch(
      "/",
      this.upload.single("avatar"),
      this.profileController.updateProfile,
    );
  };

  getRouter = () => this.router;
}
