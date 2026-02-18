import { Request, Response } from "express";
import { CategoriesService } from "./categories.service.js";

export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  create = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const result = await this.categoriesService.create(userId, req.body);
    res.status(201).send(result);
  };

  findAll = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const result = await this.categoriesService.findAll(
      userId,
      req.query as any,
    );
    res.status(200).send(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const { id } = req.params;
    const result = await this.categoriesService.update(userId, id, req.body);
    res.status(200).send(result);
  };

  softDelete = async (req: Request, res: Response) => {
    const userId = res.locals.user?.id as string;
    const { id } = req.params;
    const result = await this.categoriesService.softDelete(userId, id);
    res.status(200).send(result);
  };
}
