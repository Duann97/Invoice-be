import type { PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateCategoryDTO } from "./dto/create-category.dto.js";
import { UpdateCategoryDTO } from "./dto/update-category.dto.js";
import { GetCategoriesDTO } from "./dto/get-categories.dto.js";

export class CategoriesService {
  constructor(private prisma: PrismaClient) {}

  create = async (userId: string, body: CreateCategoryDTO) => {
    const exists = await this.prisma.category.findFirst({
      where: {
        userId,
        name: body.name,
        deletedAt: null,
      },
    });

    if (exists) throw new ApiError("Category already exists", 400);

    const created = await this.prisma.category.create({
      data: {
        userId,
        name: body.name,
      },
    });

    return created;
  };

  findAll = async (userId: string, query: GetCategoriesDTO) => {
    const includeDeleted = query.includeDeleted === true;

    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
    });

    return categories;
  };

  update = async (userId: string, id: string, body: UpdateCategoryDTO) => {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) throw new ApiError("Category not found", 404);
    if (category.deletedAt) throw new ApiError("Category already deleted", 400);

    // optional: prevent duplicate rename
    if (body.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          userId,
          name: body.name,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (duplicate) throw new ApiError("Category name already used", 400);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
      },
    });

    return updated;
  };

  softDelete = async (userId: string, id: string) => {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) throw new ApiError("Category not found", 404);
    if (category.deletedAt) {
      return { message: "Category already deleted" };
    }

    await this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: "Category deleted" };
  };
}
