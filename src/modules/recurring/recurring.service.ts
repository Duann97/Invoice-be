import {
  Prisma,
  PrismaClient,
  RecurringFrequency,
} from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { GetRecurringDTO } from "./dto/get-recurring.dto.js";
import { UpdateRecurringDTO } from "./dto/update-recurring.dto.js";

const toInt = (v: any, fallback: number) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const genInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
};

const addByFrequency = (
  base: Date,
  freq: RecurringFrequency,
  interval: number,
) => {
  const d = new Date(base);
  if (freq === "DAILY") d.setDate(d.getDate() + interval);
  if (freq === "WEEKLY") d.setDate(d.getDate() + interval * 7);
  if (freq === "MONTHLY") d.setMonth(d.getMonth() + interval);
  if (freq === "YEARLY") d.setFullYear(d.getFullYear() + interval);
  return d;
};

export class RecurringService {
  constructor(private prisma: PrismaClient) {}

  list = async (userId: string, query: GetRecurringDTO) => {
    const page = clamp(toInt((query as any).page, 1), 1, 1_000_000);
    const limit = clamp(toInt((query as any).limit, 10), 1, 100);
    const skip = (page - 1) * limit;

    const activeRaw = (query as any).active;
    const active =
      activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;

    const where: Prisma.RecurringInvoiceWhereInput = {
      userId,
      ...(active === undefined ? {} : { isActive: active }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.recurringInvoice.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          client: true,
          templateInvoice: true,
        },
      }),
      this.prisma.recurringInvoice.count({ where }),
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

  create = async (userId: string, body: CreateRecurringDTO) => {
    const interval = body.interval ?? 1;
    if (!body.clientId) throw new ApiError("clientId is required", 400);
    if (!body.startAt) throw new ApiError("startAt is required", 400);

    const client = await this.prisma.client.findFirst({
      where: { id: body.clientId, userId },
      select: { id: true },
    });
    if (!client) throw new ApiError("Client not found", 404);

    const startAt = new Date(body.startAt);
    if (Number.isNaN(startAt.getTime()))
      throw new ApiError("startAt invalid", 400);

    const endAt = body.endAt ? new Date(body.endAt) : null;
    if (endAt && Number.isNaN(endAt.getTime()))
      throw new ApiError("endAt invalid", 400);
    if (endAt && endAt < startAt)
      throw new ApiError("endAt must be >= startAt", 400);

    const nextRunAt = body.nextRunAt ? new Date(body.nextRunAt) : startAt;
    if (Number.isNaN(nextRunAt.getTime()))
      throw new ApiError("nextRunAt invalid", 400);
    if (nextRunAt < startAt)
      throw new ApiError("nextRunAt must be >= startAt", 400);

    let templateInvoiceId: string | null = null;
    if (body.templateInvoiceId) {
      const template = await this.prisma.invoice.findFirst({
        where: { id: body.templateInvoiceId, userId },
        select: { id: true, clientId: true },
      });
      if (!template) throw new ApiError("Template invoice not found", 404);
      if (template.clientId !== body.clientId) {
        throw new ApiError(
          "Template invoice client must match selected client",
          400,
        );
      }
      templateInvoiceId = template.id;
    }

    return await this.prisma.recurringInvoice.create({
      data: {
        userId,
        clientId: body.clientId,
        templateInvoiceId,
        frequency: body.frequency,
        interval,
        startAt,
        endAt: endAt ?? undefined,
        nextRunAt,
        isActive: body.isActive ?? true,
      },
      include: { client: true, templateInvoice: true },
    });
  };

  update = async (userId: string, id: string, body: UpdateRecurringDTO) => {
    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, userId },
      include: { templateInvoice: true },
    });
    if (!existing) throw new ApiError("Recurring not found", 404);

    if (body.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: body.clientId, userId },
        select: { id: true },
      });
      if (!client) throw new ApiError("Client not found", 404);
    }

    let templateInvoiceId: string | undefined = undefined;
    if (body.templateInvoiceId !== undefined) {
      if (!body.templateInvoiceId) {
        templateInvoiceId = null as any;
      } else {
        const template = await this.prisma.invoice.findFirst({
          where: { id: body.templateInvoiceId, userId },
          select: { id: true, clientId: true },
        });
        if (!template) throw new ApiError("Template invoice not found", 404);

        const targetClientId = body.clientId ?? existing.clientId;
        if (template.clientId !== targetClientId) {
          throw new ApiError(
            "Template invoice client must match selected client",
            400,
          );
        }
        templateInvoiceId = template.id;
      }
    }

    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    const nextRunAt = body.nextRunAt ? new Date(body.nextRunAt) : null;

    if (startAt && Number.isNaN(startAt.getTime()))
      throw new ApiError("startAt invalid", 400);
    if (endAt && Number.isNaN(endAt.getTime()))
      throw new ApiError("endAt invalid", 400);
    if (nextRunAt && Number.isNaN(nextRunAt.getTime()))
      throw new ApiError("nextRunAt invalid", 400);

    const finalStartAt = startAt ?? existing.startAt;
    const finalEndAt =
      endAt === null ? existing.endAt : (endAt ?? existing.endAt);
    const finalNextRunAt = nextRunAt ?? existing.nextRunAt;

    if (finalEndAt && finalEndAt < finalStartAt)
      throw new ApiError("endAt must be >= startAt", 400);
    if (finalNextRunAt < finalStartAt)
      throw new ApiError("nextRunAt must be >= startAt", 400);

    return await this.prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
        ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
        ...(body.interval !== undefined ? { interval: body.interval } : {}),
        ...(startAt ? { startAt } : {}),
        ...(body.endAt !== undefined ? { endAt: endAt ?? null } : {}),
        ...(nextRunAt ? { nextRunAt } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.templateInvoiceId !== undefined
          ? { templateInvoiceId: templateInvoiceId as any }
          : {}),
      },
      include: { client: true, templateInvoice: true },
    });
  };

  private runOne = async (recurringId: string) => {
    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      const rule = await tx.recurringInvoice.findFirst({
        where: { id: recurringId },
        include: { templateInvoice: { include: { items: true } } },
      });

      if (!rule) throw new ApiError("Recurring not found", 404);
      if (!rule.isActive) return { skipped: true, reason: "inactive" };

      if (rule.endAt && now > rule.endAt) {
        await tx.recurringInvoice.update({
          where: { id: rule.id },
          data: { isActive: false },
        });
        return { skipped: true, reason: "expired" };
      }

      if (!rule.templateInvoice) {
        throw new ApiError("Recurring rule has no templateInvoiceId", 400);
      }

      const t = rule.templateInvoice;
      const issueDate = now;

      const gapMs =
        new Date(t.dueDate).getTime() - new Date(t.issueDate).getTime();
      const dueDate = new Date(issueDate.getTime() + Math.max(gapMs, 0));

      const toDec = (v: any) => new Prisma.Decimal(String(v ?? 0));
      const subtotal = t.items.reduce((sum, it) => {
        return sum.add(toDec(it.quantity).mul(toDec(it.unitPrice)));
      }, new Prisma.Decimal(0));

      const taxAmount = new Prisma.Decimal(String(t.taxAmount ?? 0));
      const discountAmount = new Prisma.Decimal(String(t.discountAmount ?? 0));
      const total = subtotal.add(taxAmount).sub(discountAmount);

      // create new invoice
      const invoice = await tx.invoice.create({
        data: {
          userId: rule.userId,
          clientId: rule.clientId,
          invoiceNumber: genInvoiceNumber(),
          issueDate,
          dueDate,
          paymentTerms: t.paymentTerms ?? undefined,
          currency: t.currency ?? "IDR",
          status: "DRAFT",
          subtotal,
          taxAmount,
          discountAmount,
          total,
          notes: t.notes ?? undefined,
          items: {
            create: t.items.map((it) => ({
              itemName: it.itemName,
              description: it.description ?? undefined,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: toDec(it.quantity).mul(toDec(it.unitPrice)),
              productId: it.productId ?? null,
            })),
          },
        },
        include: { items: true, client: true },
      });

      // advance nextRunAt
      const next = addByFrequency(
        rule.nextRunAt,
        rule.frequency,
        rule.interval,
      );
      const willDeactivate = rule.endAt ? next > rule.endAt : false;

      await tx.recurringInvoice.update({
        where: { id: rule.id },
        data: {
          nextRunAt: next,
          ...(willDeactivate ? { isActive: false } : {}),
        },
      });

      return {
        skipped: false,
        invoice,
        nextRunAt: next,
        deactivated: willDeactivate,
      };
    });
  };

  runDue = async () => {
    const now = new Date();

    const dueRules = await this.prisma.recurringInvoice.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      select: { id: true },
      orderBy: { nextRunAt: "asc" },
      take: 50,
    });

    const results: any[] = [];
    for (const r of dueRules) {
      try {
        results.push(await this.runOne(r.id));
      } catch (e: any) {
        results.push({ skipped: true, id: r.id, error: e?.message ?? "error" });
      }
    }

    return { count: dueRules.length, results };
  };

  runManual = async (userId: string, id?: string) => {
    if (!id) return await this.runDue();

    const rule = await this.prisma.recurringInvoice.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!rule) throw new ApiError("Recurring not found", 404);

    return await this.runOne(id);
  };
}
