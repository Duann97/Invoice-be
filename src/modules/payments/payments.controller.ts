import { Request, Response } from "express";
import { PaymentsService } from "./payments.service.js";

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  create = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.paymentsService.create(userId, req.body);
    res.status(201).send(result);
  };

  list = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.paymentsService.list(userId, req.query as any);
    res.status(200).send(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = res.locals.user.id as string;
    const result = await this.paymentsService.delete(userId, req.params.id);
    res.status(200).send(result);
  };
}
