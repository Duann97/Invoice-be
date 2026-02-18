import cors from "cors";
import express, { Express } from "express";
import "reflect-metadata";
import { PORT } from "./config/env.js";
import { loggerHttp } from "./lib/logger-http.js";
import { prisma } from "./lib/prisma.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { ValidationMiddleware } from "./middlewares/validation.middleware.js";
import { JwtMiddleware } from "./middlewares/jwt.middleware.js";

// AUTH
import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";

// DASHBOARD
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { DashboardRouter } from "./modules/dashboard/dashboard.router.js";

// CLIENTS
import { ClientService } from "./modules/clients/client.service.js";
import { ClientController } from "./modules/clients/client.controller.js";
import { ClientRouter } from "./modules/clients/client.router.js";

// CATEGORIES
import { CategoriesService } from "./modules/categories/categories.service.js";
import { CategoriesController } from "./modules/categories/categories.controller.js";
import { CategoriesRouter } from "./modules/categories/categories.router.js";

// PRODUCTS
import { ProductsService } from "./modules/products/products.service.js";
import { ProductsController } from "./modules/products/products.controller.js";
import { ProductsRouter } from "./modules/products/products.router.js";

// INVOICES
import { InvoicesService } from "./modules/invoice/invoices.service.js";
import { InvoicesController } from "./modules/invoice/invoices.controller.js";
import { InvoicesRouter } from "./modules/invoice/invoices.router.js";

// PAYMENTS
import { PaymentsService } from "./modules/payments/payments.service.js";
import { PaymentsController } from "./modules/payments/payments.controller.js";
import { PaymentsRouter } from "./modules/payments/payments.router.js";

// RECURRING
import { RecurringService } from "./modules/recurring/recurring.service.js";
import { RecurringController } from "./modules/recurring/recurring.controller.js";
import { RecurringRouter } from "./modules/recurring/recurring.router.js";

// PROFILE
import { ProfileService } from "./modules/profile/profile.service.js";
import { ProfileController } from "./modules/profile/profile.controller.js";
import { ProfileRouter } from "./modules/profile/profile.router.js";

// CRON
import { RecurringCron } from "./cron/recurring.cron.js";

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.registerModules();
    this.handleError();
    this.startCronJobs();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(loggerHttp);
    this.app.use(express.json());
  }

  private registerModules() {
    const prismaClient = prisma;

    const validationMiddleware = new ValidationMiddleware();
    const jwtMiddleware = new JwtMiddleware();

    // AUTH
    const authService = new AuthService(prismaClient);
    const authController = new AuthController(authService);
    const authRouter = new AuthRouter(authController, validationMiddleware);
    this.app.use("/auth", authRouter.getRouter());

    // DASHBOARD
    // ...
    const dashboardService = new DashboardService(prisma);
    const dashboardController = new DashboardController(dashboardService);
    const dashboardRouter = new DashboardRouter(
      dashboardController,
      jwtMiddleware,
    );

    // ...
    this.app.use("/dashboard", dashboardRouter.getRouter());

    // CLIENTS
    const clientService = new ClientService(prismaClient);
    const clientController = new ClientController(clientService);
    const clientRouter = new ClientRouter(
      clientController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/clients", clientRouter.getRouter());

    // CATEGORIES
    const categoriesService = new CategoriesService(prismaClient);
    const categoriesController = new CategoriesController(categoriesService);
    const categoriesRouter = new CategoriesRouter(
      categoriesController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/categories", categoriesRouter.getRouter());

    // PRODUCTS
    const productsService = new ProductsService(prismaClient);
    const productsController = new ProductsController(productsService);
    const productsRouter = new ProductsRouter(
      productsController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/products", productsRouter.getRouter());

    // INVOICES
    const invoicesService = new InvoicesService(prismaClient);
    const invoicesController = new InvoicesController(invoicesService);
    const invoicesRouter = new InvoicesRouter(
      invoicesController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/invoices", invoicesRouter.getRouter());

    // PAYMENTS
    const paymentsService = new PaymentsService(prismaClient);
    const paymentsController = new PaymentsController(paymentsService);
    const paymentsRouter = new PaymentsRouter(
      paymentsController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/payments", paymentsRouter.getRouter());

    // RECURRING
    const recurringService = new RecurringService(prismaClient);
    const recurringController = new RecurringController(recurringService);
    const recurringRouter = new RecurringRouter(
      recurringController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/recurring", recurringRouter.getRouter());

    const profileService = new ProfileService(prismaClient);
    const profileController = new ProfileController(profileService);
    const profileRouter = new ProfileRouter(
      profileController,
      validationMiddleware,
      jwtMiddleware,
    );
    this.app.use("/profile", profileRouter.getRouter());
  }

  private startCronJobs() {
    try {
      const rc = new RecurringCron(prisma);
      rc.start();
    } catch (e) {
      console.error("[cron] failed to start recurring cron:", e);
    }
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  }
}
