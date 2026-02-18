import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  constructor(private service: DashboardService) {}

  get = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.getSummary(userId);
    return res.json({ message: "OK", data });
  };

  summary = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.getSummary(userId);

    return res.json(data);
  };
}
