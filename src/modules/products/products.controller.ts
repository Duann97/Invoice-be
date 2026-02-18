import { Request, Response } from "express";
import { ProductsService } from "./products.service.js";

export class ProductsController {
  constructor(private productsService: ProductsService) {}

  create = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const result = await this.productsService.create(userId, req.body);
    res.status(201).send(result);
  };

  findAll = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const result = await this.productsService.findAll(userId, req.query as any);
    res.status(200).send(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const { id } = req.params;
    const result = await this.productsService.update(userId, id, req.body);
    res.status(200).send(result);
  };

  softDelete = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const { id } = req.params;
    const result = await this.productsService.softDelete(userId, id);
    res.status(200).send(result);
  };
}
