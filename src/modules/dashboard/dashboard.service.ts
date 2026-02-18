import {
  PrismaClient,
  Prisma,
  InvoiceStatus,
} from "../../generated/prisma/client.js";

const toNum = (v: any) => {
  if (v === null || v === undefined) return 0;

  const raw = typeof v === "number" || typeof v === "string" ? v : String(v);

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  getSummary = async (userId: string) => {
    const OUTSTANDING: InvoiceStatus[] = ["DRAFT", "SENT", "OVERDUE"];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const outstandingStatuses = OUTSTANDING.filter(Boolean) as InvoiceStatus[];

    const [
      outstandingAgg,
      paidThisMonthAgg,
      invoicesThisMonthCount,
      overdueCount,
      recentInvoices,
      recentPayments,
      dueSoonInvoices,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          userId,
          status: { in: outstandingStatuses },
        },
        _sum: { total: true },
      }),

      this.prisma.payment.aggregate({
        where: {
          userId,
          paidAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        _sum: { amount: true },
      }),

      this.prisma.invoice.count({
        where: {
          userId,
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      }),

      // overdue count
      this.prisma.invoice.count({
        where: {
          userId,
          status: "OVERDUE",
        },
      }),

      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          client: { select: { name: true } },
        },
      }),

      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { paidAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          paidAt: true,
          notes: true,
          invoice: { select: { invoiceNumber: true } },
        },
      }),

      this.prisma.invoice.findMany({
        where: {
          userId,
          status: "SENT",
          dueDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          total: true,
          client: { select: { name: true } },
        },
      }),
    ]);

    return {
      kpis: {
        totalOutstanding: toNum(outstandingAgg._sum.total),
        totalPaidThisMonth: toNum(paidThisMonthAgg._sum.amount),
        invoicesThisMonth: invoicesThisMonthCount,
        overdueCount,
      },
      recentInvoices: (recentInvoices ?? []).map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        total: i.total as any,
        dueDate: i.dueDate as any,
        client: i.client ? { name: i.client.name ?? undefined } : null,
      })),
      recentPayments: (recentPayments ?? []).map((p) => ({
        id: p.id,
        amount: p.amount as any,
        paidAt: p.paidAt as any,
        invoice: p.invoice
          ? { invoiceNumber: p.invoice.invoiceNumber ?? undefined }
          : null,
      })),
      dueSoonInvoices: (dueSoonInvoices ?? []).map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        dueDate: i.dueDate as any,
        total: i.total as any,
        client: i.client ? { name: i.client.name ?? undefined } : null,
      })),
    };
  };
}
