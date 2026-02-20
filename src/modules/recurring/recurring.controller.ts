import { Request, Response } from "express";
import { RecurringService } from "./recurring.service.js";

export class RecurringController {
  constructor(private service: RecurringService) {}

  list = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const data = await this.service.list(userId, req.query as any);
    return res.json({ message: "OK", data });
  };

  create = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const created = await this.service.create(userId, req.body);
    return res.status(201).json({ message: "Created", data: created });
  };

  toggle = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const id = req.params.id;
    const updated = await this.service.toggle(userId, id, req.body.isActive);
    return res.json({ message: "OK", data: updated });
  };
}
