import type { PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateProductDTO } from "./dto/create-product.dto.js";
import { UpdateProductDTO } from "./dto/update-product.dto.js";
import { GetProductsDTO } from "./dto/get-products.dto.js";

export class ProductsService {
  constructor(private prisma: PrismaClient) {}

  create = async (userId: string, body: CreateProductDTO) => {
    if (body.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: body.categoryId, userId },
      });
      if (!category) throw new ApiError("Category not found", 404);
      if (category.deletedAt) throw new ApiError("Category is deleted", 400);
    }

    const existing = await this.prisma.product.findUnique({
      where: {
        userId_name: {
          userId,
          name: body.name,
        },
      },
      include: { category: true },
    });

    // kalau ada dan masih aktif -> tetap error
    if (existing && existing.deletedAt === null) {
      throw new ApiError("Product already exists", 400);
    }

    if (existing && existing.deletedAt !== null) {
      const revived = await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          name: body.name,
          description: body.description,
          unitPrice: body.unitPrice as any,
          unit: body.unit,
          categoryId: body.categoryId ?? null,
        },
        include: { category: true },
      });
      return revived;
    }

    const created = await this.prisma.product.create({
      data: {
        userId,
        name: body.name,
        description: body.description,
        unitPrice: body.unitPrice as any,
        unit: body.unit,
        categoryId: body.categoryId ?? null,
      },
      include: { category: true },
    });

    return created;
  };

  findAll = async (userId: string, query: GetProductsDTO) => {
    const includeDeleted = query.includeDeleted === true;

    const where: any = {
      userId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.q && query.q.trim().length > 0) {
      where.name = { contains: query.q.trim(), mode: "insensitive" };
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
      },
    });

    return products;
  };

  update = async (userId: string, id: string, body: UpdateProductDTO) => {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) throw new ApiError("Product not found", 404);
    if (product.deletedAt) throw new ApiError("Product already deleted", 400);

    // kalau mau ubah category
    if (body.categoryId !== undefined) {
      const nextCategoryId = body.categoryId === "" ? null : body.categoryId;

      if (nextCategoryId) {
        const category = await this.prisma.category.findFirst({
          where: { id: nextCategoryId, userId },
        });
        if (!category) throw new ApiError("Category not found", 404);
        if (category.deletedAt) throw new ApiError("Category is deleted", 400);
      }

      (body as any).categoryId = nextCategoryId;
    }

    if (body.name) {
      const dup = await this.prisma.product.findFirst({
        where: {
          userId,
          name: body.name,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) throw new ApiError("Product name already used", 400);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.unitPrice !== undefined
          ? { unitPrice: body.unitPrice as any }
          : {}),
        ...(body.unit !== undefined ? { unit: body.unit } : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId as any }
          : {}),
      },
      include: {
        category: true,
      },
    });

    return updated;
  };

  softDelete = async (userId: string, id: string) => {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) throw new ApiError("Product not found", 404);

    if (product.deletedAt) {
      return { message: "Product already deleted" };
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Product deleted" };
  };
}
