import { Request, Response } from "express";
import { InvoicesService } from "./invoices.service.js";

export class InvoicesController {
  constructor(private service: InvoicesService) {}

  create = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.create(userId, req.body);
    return res.status(201).json({ message: "Invoice created", data });
  };

  list = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const result = await this.service.list(userId, req.query as any);
    return res.json({ message: "OK", ...result });
  };

  detail = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.detail(userId, req.params.id);
    return res.json({ message: "OK", data });
  };

  update = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.update(userId, req.params.id, req.body);
    return res.json({ message: "Invoice updated", data });
  };

  updateStatus = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.updateStatus(
      userId,
      req.params.id,
      req.body,
    );
    return res.json({ message: "Invoice status updated", data });
  };

  cancel = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.cancel(userId, req.params.id);
    return res.json({ message: "Invoice cancelled", data });
  };

  send = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string;
    const data = await this.service.sendInvoiceEmail(userId, req.params.id);
    return res.json({ message: "Invoice sent to client email", data });
  };
}
