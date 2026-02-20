import {
  PrismaClient,
  Prisma,
  RecurringFrequency,
} from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreateRecurringDTO } from "./dto/create-recurring.dto.js";
import { ListRecurringDTO } from "./dto/list-recurring.dto.js";
import { UpdateRecurringDTO } from "./dto/update-recurring.dto.js";

const toInt = (v: any, fallback = 1) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const safeDate = (v: any) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const genInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
};

function addInterval(base: Date, freq: RecurringFrequency, interval: number) {
  const d = new Date(base);
  const step = Math.max(1, interval);

  if (freq === "DAILY") d.setDate(d.getDate() + step);
  else if (freq === "WEEKLY") d.setDate(d.getDate() + step * 7);
  else if (freq === "MONTHLY") d.setMonth(d.getMonth() + step);
  else if (freq === "YEARLY") d.setFullYear(d.getFullYear() + step);
  else d.setMonth(d.getMonth() + step);

  return d;
}

export class RecurringService {
  constructor(private prisma: PrismaClient) {}

  private shouldAutoDeactivate(
    now: Date,
    nextRunAt: Date,
    endAt?: Date | null,
  ) {
    if (!endAt) return false;
    const end = endOfDay(endAt);
    return now.getTime() > end.getTime() || nextRunAt.getTime() > end.getTime();
  }

  create = async (userId: string, body: CreateRecurringDTO) => {
    if (!userId) throw new ApiError("Unauthorized", 401);

    const interval = toInt(body.interval, 1);
    const frequency = String(
      body.frequency || "MONTHLY",
    ).toUpperCase() as RecurringFrequency;

    const startAt = safeDate(body.startAt);
    if (!startAt) throw new ApiError("startAt invalid date", 400);

    const endAt = body.endAt ? safeDate(body.endAt) : null;
    if (body.endAt && !endAt) throw new ApiError("endAt invalid date", 400);

    const client = await this.prisma.client.findFirst({
      where: { id: body.clientId, userId },
      select: { id: true },
    });
    if (!client) throw new ApiError("Client not found", 404);

    // ✅ template invoice harus milik user & client yang sama
    const template = await this.prisma.invoice.findFirst({
      where: { id: body.templateInvoiceId, userId, clientId: body.clientId },
      select: { id: true },
    });
    if (!template)
      throw new ApiError("Template invoice not found for this client", 404);

    const nextRunAt = startAt;

    const now = new Date();
    const willDeactivate = this.shouldAutoDeactivate(now, nextRunAt, endAt);
    const isActive =
      body.isActive !== undefined ? Boolean(body.isActive) : true;

    const created = await this.prisma.recurringInvoice.create({
      data: {
        userId,
        clientId: body.clientId,
        templateInvoiceId: body.templateInvoiceId,
        frequency,
        interval,
        startAt,
        nextRunAt,
        endAt: endAt ?? undefined,
        isActive: willDeactivate ? false : isActive,
      },
      include: {
        client: { select: { id: true, name: true } },
        templateInvoice: {
          select: { id: true, invoiceNumber: true, status: true, total: true },
        },
      },
    });

    return created;
  };

  list = async (userId: string, query: ListRecurringDTO) => {
    if (!userId) throw new ApiError("Unauthorized", 401);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RecurringInvoiceWhereInput = {
      userId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.isActive === "true" ? { isActive: true } : {}),
      ...(query.isActive === "false" ? { isActive: false } : {}),
    };

    if (query.q) {
      where.OR = [
        { client: { name: { contains: query.q, mode: "insensitive" } } },
        {
          templateInvoice: {
            invoiceNumber: { contains: query.q, mode: "insensitive" },
          },
        },
      ];
    }

    // ✅ auto-inactive kalau endAt sudah lewat
    const now = new Date();
    await this.prisma.recurringInvoice.updateMany({
      where: { userId, isActive: true, endAt: { not: null, lte: now } },
      data: { isActive: false },
    });

    const [data, total] = await Promise.all([
      this.prisma.recurringInvoice.findMany({
        where,
        orderBy: [
          { isActive: "desc" },
          { nextRunAt: "asc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          templateInvoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
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

  update = async (userId: string, id: string, body: UpdateRecurringDTO) => {
    if (!userId) throw new ApiError("Unauthorized", 401);

    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, userId },
      select: {
        id: true,
        nextRunAt: true,
        endAt: true,
        interval: true,
        frequency: true,
      },
    });
    if (!existing) throw new ApiError("Recurring not found", 404);

    const patch: Prisma.RecurringInvoiceUpdateInput = {};

    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
    if (body.frequency)
      patch.frequency = String(body.frequency).toUpperCase() as any;
    if (body.interval !== undefined)
      patch.interval = toInt(body.interval, existing.interval);

    let nextEndAt = existing.endAt as any as Date | null;
    if (body.endAt !== undefined) {
      const d = body.endAt ? safeDate(body.endAt) : null;
      if (body.endAt && !d) throw new ApiError("endAt invalid date", 400);
      patch.endAt = d ?? null;
      nextEndAt = d ?? null;
    }

    // ✅ kalau endAt bikin expired → auto off
    const now = new Date();
    const willDeactivate = this.shouldAutoDeactivate(
      now,
      existing.nextRunAt as any,
      nextEndAt,
    );

    const updated = await this.prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...patch,
        ...(willDeactivate ? { isActive: false } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        templateInvoice: {
          select: { id: true, invoiceNumber: true, status: true, total: true },
        },
      },
    });

    return updated;
  };

  toggle = async (userId: string, id: string, isActive: boolean) => {
    if (!userId) throw new ApiError("Unauthorized", 401);

    const existing = await this.prisma.recurringInvoice.findFirst({
      where: { id, userId },
      select: { id: true, nextRunAt: true, endAt: true },
    });
    if (!existing) throw new ApiError("Recurring not found", 404);

    const now = new Date();
    const willDeactivate = this.shouldAutoDeactivate(
      now,
      existing.nextRunAt as any,
      existing.endAt as any,
    );

    const updated = await this.prisma.recurringInvoice.update({
      where: { id },
      data: { isActive: willDeactivate ? false : Boolean(isActive) },
    });

    return updated;
  };

  /**
   * dipanggil dari cron:
   * - cari recurring aktif yang nextRunAt <= now
   * - clone template invoice jadi invoice baru (DRAFT)
   * - update occurrenceCount, lastRunAt, nextRunAt
   * - auto inactive kalau nextRunAt berikutnya melewati endAt
   */
  runDue = async () => {
    const now = new Date();

    const due = await this.prisma.recurringInvoice.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: "asc" },
      take: 50,
      include: {
        templateInvoice: { include: { items: true } },
      },
    });

    let ran = 0;

    for (const r of due) {
      // kalau expired, off
      if (this.shouldAutoDeactivate(now, r.nextRunAt, r.endAt)) {
        await this.prisma.recurringInvoice.update({
          where: { id: r.id },
          data: { isActive: false },
        });
        continue;
      }

      const template = r.templateInvoice;
      if (!template) {
        await this.prisma.recurringInvoice.update({
          where: { id: r.id },
          data: { isActive: false },
        });
        continue;
      }

      const issueDate = new Date(now);

      // preserve gap dueDate - issueDate dari template
      const tIssue = new Date(template.issueDate as any);
      const tDue = new Date(template.dueDate as any);
      const gapMs =
        Number.isNaN(tIssue.getTime()) || Number.isNaN(tDue.getTime())
          ? 0
          : Math.max(0, tDue.getTime() - tIssue.getTime());
      const dueDate = new Date(issueDate.getTime() + gapMs);

      let invoiceNumber = genInvoiceNumber();
      const exists = await this.prisma.invoice.findFirst({
        where: { userId: r.userId, invoiceNumber },
        select: { id: true },
      });
      if (exists) invoiceNumber = genInvoiceNumber();

      const itemsCreate = (template.items ?? []).map((it: any) => ({
        itemName: it.itemName,
        description: it.description ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        productId: it.productId ?? null,
      }));

      await this.prisma.$transaction(async (tx) => {
        await tx.invoice.create({
          data: {
            userId: r.userId,
            clientId: r.clientId,
            invoiceNumber,
            issueDate,
            dueDate,
            paymentTerms: (template as any).paymentTerms ?? undefined,
            currency: (template as any).currency ?? "IDR",
            status: "DRAFT",
            subtotal: template.subtotal,
            taxAmount: template.taxAmount,
            discountAmount: template.discountAmount,
            total: template.total,
            notes: (template as any).notes ?? undefined,
            items: { create: itemsCreate },
          },
        });

        const nextRunAt = addInterval(r.nextRunAt, r.frequency, r.interval);
        const willDeactivate = this.shouldAutoDeactivate(
          now,
          nextRunAt,
          r.endAt,
        );

        await tx.recurringInvoice.update({
          where: { id: r.id },
          data: {
            lastRunAt: now,
            occurrenceCount: { increment: 1 },
            nextRunAt,
            isActive: willDeactivate ? false : true,
          },
        });
      });

      ran += 1;
    }

    return { ran };
  };
}
