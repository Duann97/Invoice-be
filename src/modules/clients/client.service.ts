import { PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateClientDTO } from "./dto/create-client.dto.js";
import { GetClientsDTO } from "./dto/get-clients.dto.js";
import { UpdateClientDTO } from "./dto/update-client.dto.js";

const toInt = (v: any, fallback: number) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export class ClientService {
  constructor(private prisma: PrismaClient) {}

  createClient = async (userId: string, body: CreateClientDTO) => {
    if (body.email) {
      const existing = await this.prisma.client.findFirst({
        where: {
          userId,
          email: { equals: body.email, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ApiError("Email already exist", 400);
      }
    }

    return await this.prisma.client.create({
      data: {
        userId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        paymentPreference: body.paymentPreference,
        notes: body.notes,
      },
    });
  };

  getClients = async (userId: string, query: GetClientsDTO) => {
    const page = clamp(toInt((query as any).page, 1), 1, 1_000_000);
    const limit = clamp(toInt((query as any).limit, 10), 1, 100);
    const skip = (page - 1) * limit;

    const q = (query as any).q?.trim?.()
      ? String((query as any).q).trim()
      : undefined;

    const where: any = {
      userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getClientById = async (userId: string, id: string) => {
    const client = await this.prisma.client.findFirst({
      where: { id, userId },
    });

    if (!client) throw new ApiError("Client not found", 404);

    return client;
  };

  updateClient = async (userId: string, id: string, body: UpdateClientDTO) => {
    const exists = await this.prisma.client.findFirst({
      where: { id, userId },
      select: { id: true, email: true },
    });
    if (!exists) throw new ApiError("Client not found", 404);

    if (body.email !== undefined && body.email) {
      const dup = await this.prisma.client.findFirst({
        where: {
          userId,
          email: { equals: body.email, mode: "insensitive" },
          NOT: { id },
        },
        select: { id: true },
      });

      if (dup) {
        throw new ApiError("Email already exist", 400);
      }
    }

    return await this.prisma.client.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.paymentPreference !== undefined
          ? { paymentPreference: body.paymentPreference }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
  };

  deleteClient = async (userId: string, id: string) => {
    const exists = await this.prisma.client.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!exists) throw new ApiError("Client not found", 404);

    const invoiceCount = await this.prisma.invoice.count({
      where: { clientId: id, userId },
    });

    if (invoiceCount > 0) {
      throw new ApiError(
        "Client cannot be deleted because it has invoices",
        400,
      );
    }

    await this.prisma.client.delete({ where: { id } });

    return { message: "Client deleted" };
  };
}
