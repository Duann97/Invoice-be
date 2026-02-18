import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";

export class DashboardRouter {
  private router: Router;

  constructor(
    private controller: DashboardController,
    private jwt: JwtMiddleware,
  ) {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(this.jwt.verifyToken(JWT_SECRET!));

    // ✅ endpoint lama
    this.router.get("/", this.controller.get);

    // ✅ endpoint baru sesuai FE: /dashboard/summary
    this.router.get("/summary", this.controller.summary);
  }

  getRouter() {
    return this.router;
  }
}
