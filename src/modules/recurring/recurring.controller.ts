import { Request, Response } from "express";
import { RecurringService } from "./recurring.service.js";

export class RecurringController {
  constructor(private recurringService: RecurringService) {}

  create = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const data = await this.recurringService.create(userId, req.body);
    return res.status(201).json({ message: "Recurring created", data });
  };

  list = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const result = await this.recurringService.list(userId, req.query as any);
    return res.json({ message: "OK", ...result });
  };

  update = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const data = await this.recurringService.update(
      userId,
      req.params.id,
      req.body,
    );
    return res.json({ message: "Recurring updated", data });
  };

  toggle = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const isActive = Boolean((req.body as any)?.isActive);
    const data = await this.recurringService.toggle(
      userId,
      req.params.id,
      isActive,
    );
    return res.json({ message: "Recurring updated", data });
  };
}
