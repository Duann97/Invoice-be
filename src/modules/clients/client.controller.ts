import { Request, Response } from "express";
import { ClientService } from "./client.service.js";

export class ClientController {
  constructor(private clientService: ClientService) {}

  createClient = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.clientService.createClient(userId, req.body);
    res.status(201).send(result);
  };

  getClients = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.clientService.getClients(
      userId,
      req.query as any,
    );
    res.status(200).send(result);
  };

  getClientById = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.clientService.getClientById(
      userId,
      req.params.id,
    );
    res.status(200).send(result);
  };

  updateClient = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.clientService.updateClient(
      userId,
      req.params.id,
      req.body,
    );
    res.status(200).send(result);
  };

  deleteClient = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.clientService.deleteClient(userId, req.params.id);
    res.status(200).send(result);
  };
}
