import { Request, Response } from "express";
import { RecurringService } from "./recurring.service.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { GetRecurringDTO } from "./dto/get-recurring.dto.js";
import { UpdateRecurringDTO } from "./dto/update-recurring.dto.js";
import { RunRecurringDTO } from "./dto/run-recurring.dto.js";

export class RecurringController {
  constructor(private recurringService: RecurringService) {}

  list = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const query = (res.locals.query ?? req.query) as any as GetRecurringDTO;

    const result = await this.recurringService.list(userId, query);
    return res.status(200).json({ message: "OK", ...result });
  };

  create = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const body = req.body as CreateRecurringDTO;

    const created = await this.recurringService.create(userId, body);
    return res
      .status(201)
      .json({ message: "Recurring created", data: created });
  };

  update = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const { id } = req.params;
    const body = req.body as UpdateRecurringDTO;

    const updated = await this.recurringService.update(userId, id, body);
    return res
      .status(200)
      .json({ message: "Recurring updated", data: updated });
  };

  run = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const body = (req.body ?? {}) as RunRecurringDTO;

    const result = await this.recurringService.runManual(userId, body.id);
    return res.status(200).json({ message: "OK", data: result });
  };
}
