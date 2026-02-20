import {
  PrismaClient,
  Prisma,
  RecurringFrequency,
} from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { ListRecurringDTO } from "./dto/list-recurring.dto.js";

const toDate = (s: string) => new Date(s);

function addInterval(base: Date, freq: RecurringFrequency, interval: number) {
  const d = new Date(base);
  const n = Math.max(Number(interval || 1), 1);

  if (freq === "DAILY") d.setDate(d.getDate() + n);
  else if (freq === "WEEKLY") d.setDate(d.getDate() + n * 7);
  else if (freq === "MONTHLY") d.setMonth(d.getMonth() + n);
  else if (freq === "YEARLY") d.setFullYear(d.getFullYear() + n);

  return d;
}

export class RecurringService {
  constructor(private prisma: PrismaClient) {}

  private computeInitialNextRunAt(startAt: Date) {
    // Simple & predictable: first run = startAt
    return startAt;
  }

  private shouldDeactivate(endAt: Date | null, nextRunAt: Date) {
    if (!endAt) return false;
    return nextRunAt.getTime() > endAt.getTime();
  }

  create = async (userId: string, body: CreateRecurringDTO) => {
    // validate client
    const client = await this.prisma.client.findFirst({
      where: { id: body.clientId, userId },
      select: { id: true },
    });
    if (!client) throw new ApiError("Client not found", 404);

    // validate template invoice must belong to user+client
    const template = await this.prisma.invoice.findFirst({
      where: { id: body.templateInvoiceId, userId, clientId: body.clientId },
      select: { id: true },
    });
    if (!template) {
      throw new ApiError(
        "Template invoice not found (must belong to selected client)",
        404,
      );
    }

    const startAt = toDate(body.startAt);
    if (Number.isNaN(startAt.getTime()))
      throw new ApiError("Invalid startAt", 400);

    const endAt = body.endAt ? toDate(body.endAt) : null;
    if (endAt && Number.isNaN(endAt.getTime()))
      throw new ApiError("Invalid endAt", 400);

    if (endAt && endAt.getTime() < startAt.getTime()) {
      throw new ApiError("endAt must be after startAt", 400);
    }

    const interval = Math.max(Number(body.interval || 1), 1);
    const frequency = body.frequency as any as RecurringFrequency;

    const nextRunAt = this.computeInitialNextRunAt(startAt);

    // IMPORTANT: schema kamu punya templateInvoiceId @unique
    // Jadi kalau template invoice sudah pernah dipakai recurring, create akan error P2002.
    // Kita kasih message yang jelas.
    try {
      const created = await this.prisma.recurringInvoice.create({
        data: {
          userId,
          clientId: body.clientId,
          templateInvoiceId: body.templateInvoiceId, // schema: String? tapi kita wajibkan dari DTO
          frequency,
          interval,
          startAt,
          endAt: endAt ?? undefined,
          nextRunAt,
          isActive: body.isActive ?? true,
        },
        include: {
          client: { select: { id: true, name: true } },
          templateInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true,
            },
          },
        },
      });

      return created;
    } catch (e: any) {
      // Prisma unique constraint
      if (e?.code === "P2002") {
        throw new ApiError(
          "Template invoice sudah dipakai di recurring lain. Buat invoice template baru atau hapus @unique di schema.",
          400,
        );
      }
      throw e;
    }
  };

  list = async (userId: string, query: ListRecurringDTO) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RecurringInvoiceWhereInput = { userId };

    if (query.active === "active") where.isActive = true;
    if (query.active === "inactive") where.isActive = false;

    const [data, total] = await Promise.all([
      this.prisma.recurringInvoice.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          templateInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.recurringInvoice.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  };

  toggle = async (userId: string, id: string, isActive: boolean) => {
    const rule = await this.prisma.recurringInvoice.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!rule) throw new ApiError("Recurring rule not found", 404);

    return this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });
  };

  /**
   * Cron runner: generate invoice untuk rules yang due.
   * Sesuai schema lama: stop hanya pakai endAt.
   */
  runDueRules = async () => {
    const now = new Date();

    const dueRules = await this.prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        templateInvoice: {
          include: { items: true },
        },
      },
      take: 50,
    });

    for (const rule of dueRules) {
      const tpl: any = rule.templateInvoice;

      // kalau template invoice hilang/null (karena onDelete SetNull), matikan rule biar gak error terus
      if (!tpl || !rule.templateInvoiceId) {
        await this.prisma.recurringInvoice.update({
          where: { id: rule.id },
          data: { isActive: false },
        });
        continue;
      }

      const issueDate = now;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 7);

      await this.prisma.invoice.create({
        data: {
          userId: rule.userId,
          clientId: rule.clientId,
          invoiceNumber: `INV-${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, "0")}-${Math.random()
            .toString(16)
            .slice(2, 6)
            .toUpperCase()}`,
          issueDate,
          dueDate,
          currency: tpl.currency ?? "IDR",
          status: "DRAFT",
          subtotal: tpl.subtotal,
          taxAmount: tpl.taxAmount,
          discountAmount: tpl.discountAmount,
          total: tpl.total,
          notes: tpl.notes ?? undefined,
          items: {
            create: (tpl.items ?? []).map((it: any) => ({
              itemName: it.itemName,
              description: it.description ?? undefined,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
              productId: it.productId ?? null,
            })),
          },
        },
      });

      const next = addInterval(
        new Date(rule.nextRunAt),
        rule.frequency,
        rule.interval,
      );
      const endAt = rule.endAt ? new Date(rule.endAt) : null;

      const willDeactivate = this.shouldDeactivate(endAt, next);

      await this.prisma.recurringInvoice.update({
        where: { id: rule.id },
        data: {
          nextRunAt: next,
          isActive: willDeactivate ? false : true,
        },
      });
    }

    return { processed: dueRules.length };
  };
}
