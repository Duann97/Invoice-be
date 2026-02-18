import { Router } from "express";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { JwtMiddleware } from "../../middlewares/jwt.middleware.js";
import { JWT_SECRET } from "../../config/env.js";
import { ClientController } from "./client.controller.js";
import { CreateClientDTO } from "./dto/create-client.dto.js";
import { GetClientsDTO } from "./dto/get-clients.dto.js";
import { UpdateClientDTO } from "./dto/update-client.dto.js";

export class ClientRouter {
  private router: Router;

  constructor(
    private clientController: ClientController,
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
      this.validationMiddleware.validateQuery(GetClientsDTO),
      this.clientController.getClients,
    );

    this.router.get("/:id", this.clientController.getClientById);

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateClientDTO),
      this.clientController.createClient,
    );

    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateClientDTO),
      this.clientController.updateClient,
    );

    this.router.delete("/:id", this.clientController.deleteClient);
  };

  getRouter = () => {
    return this.router;
  };
}
