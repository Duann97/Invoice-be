import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import { CreatePaymentDTO } from "./dto/create-payment.dto.js";
import { ListPaymentsDTO } from "./dto/list-payments.dto.js";

const toDec = (v: any) => new Prisma.Decimal(String(v ?? 0));
const toNumber = (v: any) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
};

export class PaymentsService {
  constructor(private prisma: PrismaClient) {}

  private async recomputeAndSyncInvoiceStatus(
    userId: string,
    invoiceId: string,
  ) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { id: true, status: true, total: true },
    });
    if (!inv) throw new ApiError("Invoice not found", 404);

    const agg = await this.prisma.payment.aggregate({
      where: { userId, invoiceId },
      _sum: { amount: true },
    });

    const totalPaidDec = agg._sum.amount ?? new Prisma.Decimal(0);
    const invoiceTotalDec = inv.total ?? new Prisma.Decimal(0);

    const shouldBePaid = totalPaidDec.greaterThanOrEqualTo(invoiceTotalDec);

    const nextStatus = shouldBePaid
      ? "PAID"
      : inv.status === "PAID"
        ? "SENT"
        : inv.status;

    if (nextStatus !== inv.status) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: nextStatus as any },
      });
    }

    return {
      invoiceId,
      totalPaid: totalPaidDec,
      invoiceTotal: invoiceTotalDec,
      status: nextStatus,
    };
  }

  create = async (userId: string, body: CreatePaymentDTO) => {
    const amountNum = toNumber(body.amount);
    if (!body.invoiceId) throw new ApiError("invoiceId is required", 400);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new ApiError("amount must be a positive number", 400);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { id: body.invoiceId, userId },
        select: { id: true, status: true, total: true },
      });
      if (!inv) throw new ApiError("Invoice not found", 404);

      const aggBefore = await tx.payment.aggregate({
        where: { userId, invoiceId: body.invoiceId },
        _sum: { amount: true },
      });

      const totalPaidBefore = aggBefore._sum.amount ?? new Prisma.Decimal(0);
      const invoiceTotal = inv.total ?? new Prisma.Decimal(0);
      const remaining = invoiceTotal.sub(totalPaidBefore);
      const amountDec = toDec(amountNum);

      if (remaining.lessThanOrEqualTo(new Prisma.Decimal(0))) {
        throw new ApiError("Invoice already fully paid", 400);
      }

      if (amountDec.greaterThan(remaining)) {
        throw new ApiError(
          `Amount melebihi sisa tagihan. Maksimal: ${remaining.toFixed()}`,
          400,
        );
      }

      const payment = await tx.payment.create({
        data: {
          userId,
          invoiceId: body.invoiceId,
          amount: toDec(amountNum),
          paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
          notes: body.notes ?? null,
        },
      });

      const sync = await (async () => {
        const agg = await tx.payment.aggregate({
          where: { userId, invoiceId: body.invoiceId },
          _sum: { amount: true },
        });

        const inv2 = await tx.invoice.findFirst({
          where: { id: body.invoiceId, userId },
          select: { id: true, status: true, total: true },
        });
        if (!inv2) throw new ApiError("Invoice not found", 404);

        const totalPaidDec = agg._sum.amount ?? new Prisma.Decimal(0);
        const invoiceTotalDec = inv2.total ?? new Prisma.Decimal(0);

        const shouldBePaid = totalPaidDec.greaterThanOrEqualTo(invoiceTotalDec);
        const nextStatus = shouldBePaid
          ? "PAID"
          : inv2.status === "PAID"
            ? "SENT"
            : inv2.status;

        if (nextStatus !== inv2.status) {
          await tx.invoice.update({
            where: { id: body.invoiceId },
            data: { status: nextStatus as any },
          });
        }

        return { nextStatus, totalPaidDec, invoiceTotalDec };
      })();

      return { payment, invoiceStatus: sync.nextStatus };
    });

    return created;
  };

  list = async (userId: string, query: ListPaymentsDTO) => {
    const page = Math.max(Number((query as any).page) || 1, 1);
    const limit = Math.min(
      Math.max(Number((query as any).limit) || 10, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.invoiceId) where.invoiceId = query.invoiceId;

    if (query.dateFrom || query.dateTo) {
      where.paidAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const sortDir = (query.sort ?? "desc") as "asc" | "desc";

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { paidAt: sortDir },
        skip,
        take: limit,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  delete = async (userId: string, id: string) => {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId },
      select: { id: true, invoiceId: true },
    });
    if (!payment) throw new ApiError("Payment not found", 404);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });

      const agg = await tx.payment.aggregate({
        where: { userId, invoiceId: payment.invoiceId },
        _sum: { amount: true },
      });

      const inv = await tx.invoice.findFirst({
        where: { id: payment.invoiceId, userId },
        select: { id: true, status: true, total: true },
      });
      if (!inv) throw new ApiError("Invoice not found", 404);

      const totalPaidDec = agg._sum.amount ?? new Prisma.Decimal(0);
      const invoiceTotalDec = inv.total ?? new Prisma.Decimal(0);

      const shouldBePaid = totalPaidDec.greaterThanOrEqualTo(invoiceTotalDec);
      const nextStatus = shouldBePaid
        ? "PAID"
        : inv.status === "PAID"
          ? "SENT"
          : inv.status;

      if (nextStatus !== inv.status) {
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: nextStatus as any },
        });
      }

      return { message: "Payment deleted", invoiceStatus: nextStatus };
    });

    return result;
  };
}
