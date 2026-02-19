// src/modules/invoice/invoices.service.ts
import {
  PrismaClient,
  Prisma,
  InvoiceStatus,
  EmailStatus,
} from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";

import { CreateInvoiceDTO } from "./dto/create-invoice.dto.js";
import { ListInvoicesDTO } from "./dto/list-invoices.dto.js";
import { UpdateInvoiceDTO } from "./dto/update-invoice.dto.js";
import { UpdateInvoiceStatusDTO } from "./dto/update-invoice-status.dto.js";

import { MailService } from "../mail/mail.service.js";

const safeTrim = (v?: string | null) => (v ?? "").trim();

const genInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
};

const toDec = (v: any) => new Prisma.Decimal(String(v ?? 0));

/**
 * ✅ FIX: support Prisma.Decimal and any numeric-like object via toString()
 */
const toNum = (v: any) => {
  if (v === null || v === undefined) return 0;

  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Prisma.Decimal (or similar): has toString()
  try {
    if (typeof v?.toString === "function") {
      const n = Number(v.toString());
      return Number.isFinite(n) ? n : 0;
    }
  } catch {}

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export class InvoicesService {
  private mail = new MailService();

  constructor(private prisma: PrismaClient) {}

  private formatIDR = (v: any) => {
    const n = toNum(v);
    return n.toLocaleString("id-ID");
  };

  private endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  private shouldBeOverdue = (status: any, dueDate: any) => {
    const s = String(status ?? "").toUpperCase();
    if (s !== "SENT") return false;
    if (!dueDate) return false;

    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return false;

    return new Date().getTime() > this.endOfDay(due).getTime();
  };

  private syncOverdueForInvoices = async (
    userId: string,
    invoices: Array<{ id: string; status?: any; dueDate?: any }>,
  ) => {
    const overdueIds = invoices
      .filter((inv) => this.shouldBeOverdue(inv.status, inv.dueDate))
      .map((inv) => inv.id);

    if (overdueIds.length === 0) return overdueIds;

    await this.prisma.invoice.updateMany({
      where: {
        userId,
        id: { in: overdueIds },
        status: "SENT",
      },
      data: { status: "OVERDUE" as any },
    });

    return overdueIds;
  };

  private syncOverdueForSingle = async (userId: string, id: string) => {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, userId },
      select: { id: true, status: true, dueDate: true },
    });
    if (!inv) throw new ApiError("Invoice not found", 404);

    if (!this.shouldBeOverdue(inv.status, inv.dueDate)) return false;

    await this.prisma.invoice.update({
      where: { id },
      data: { status: "OVERDUE" as any },
    });

    return true;
  };

  create = async (userId: string, body: CreateInvoiceDTO) => {
    if (!body.clientId) throw new ApiError("clientId is required", 400);
    if (!body.issueDate) throw new ApiError("issueDate is required", 400);
    if (!body.dueDate) throw new ApiError("dueDate is required", 400);
    if (!body.items?.length) throw new ApiError("items is required", 400);

    const client = await this.prisma.client.findFirst({
      where: { id: body.clientId, userId },
      select: { id: true },
    });
    if (!client) throw new ApiError("Client not found", 404);

    let invoiceNumber = safeTrim((body as any).invoiceNumber);
    if (!invoiceNumber) invoiceNumber = genInvoiceNumber();

    const exists = await this.prisma.invoice.findFirst({
      where: { userId, invoiceNumber },
      select: { id: true },
    });
    if (exists) throw new ApiError("Invoice number already exists", 400);

    const itemsSubtotal = body.items.reduce((sum, it: any) => {
      const qty = toDec(it.quantity ?? 0);
      const price = toDec(it.unitPrice ?? 0);
      return sum.add(qty.mul(price));
    }, new Prisma.Decimal(0));

    const taxAmount = toDec((body as any).taxAmount ?? 0);
    const discountAmount = toDec((body as any).discountAmount ?? 0);
    const subtotal = itemsSubtotal;
    const total = subtotal.add(taxAmount).sub(discountAmount);

    const created = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          userId,
          clientId: body.clientId,
          invoiceNumber,
          issueDate: new Date(body.issueDate),
          dueDate: new Date(body.dueDate),

          paymentTerms: (body as any).paymentTerms ?? undefined,
          currency: (body as any).currency ?? "IDR",

          status: "DRAFT",

          subtotal,
          taxAmount,
          discountAmount,
          total,

          notes: (body as any).notes ?? undefined,

          items: {
            create: body.items.map((it: any) => ({
              itemName: safeTrim(it.itemName || it.name || "Item"),
              description: it.description ?? undefined,
              quantity: toDec(it.quantity ?? 0),
              unitPrice: toDec(it.unitPrice ?? 0),
              lineTotal: toDec(it.quantity ?? 0).mul(toDec(it.unitPrice ?? 0)),
              productId: it.productId ? it.productId : null,
            })),
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });

      return inv;
    });

    return created;
  };

  list = async (userId: string, query: ListInvoicesDTO) => {
    const page = Math.max(Number((query as any).page) || 1, 1);
    const limit = Math.min(
      Math.max(Number((query as any).limit) || 10, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(query.status ? { status: query.status as InvoiceStatus } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };

    if (query.q) {
      where.OR = [
        { invoiceNumber: { contains: query.q, mode: "insensitive" } },
        { client: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }

    if ((query as any).dateFrom || (query as any).dateTo) {
      const dateFrom = (query as any).dateFrom
        ? new Date((query as any).dateFrom)
        : null;
      const dateTo = (query as any).dateTo
        ? new Date((query as any).dateTo)
        : null;

      where.issueDate = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          client: true,
          items: { include: { product: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const overdueIds = await this.syncOverdueForInvoices(
      userId,
      data.map((x: any) => ({
        id: x.id,
        status: x.status,
        dueDate: x.dueDate,
      })),
    );

    const dataPatched =
      overdueIds.length === 0
        ? data
        : data.map((inv: any) =>
            overdueIds.includes(inv.id) ? { ...inv, status: "OVERDUE" } : inv,
          );

    return {
      data: dataPatched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  detail = async (userId: string, id: string) => {
    await this.syncOverdueForSingle(userId, id);

    const inv = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        client: true,
        items: { include: { product: true } },
        payments: true,
        emails: true,
      },
    });

    if (!inv) throw new ApiError("Invoice not found", 404);
    return inv;
  };

  update = async (userId: string, id: string, body: UpdateInvoiceDTO) => {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, userId },
      select: { id: true, clientId: true },
    });
    if (!inv) throw new ApiError("Invoice not found", 404);

    if (body.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: body.clientId, userId },
        select: { id: true },
      });
      if (!client) throw new ApiError("Client not found", 404);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0);
      let taxAmount = toDec((body as any).taxAmount ?? 0);
      let discountAmount = toDec((body as any).discountAmount ?? 0);

      if ((body as any).items?.length) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

        const items = (body as any).items as any[];

        subtotal = items.reduce((sum, it) => {
          const qty = toDec(it.quantity ?? 0);
          const price = toDec(it.unitPrice ?? 0);
          return sum.add(qty.mul(price));
        }, new Prisma.Decimal(0));

        await tx.invoiceItem.createMany({
          data: items.map((it) => ({
            invoiceId: id,
            itemName: safeTrim(it.itemName || it.name || "Item"),
            description: it.description ?? null,
            quantity: toDec(it.quantity ?? 0),
            unitPrice: toDec(it.unitPrice ?? 0),
            lineTotal: toDec(it.quantity ?? 0).mul(toDec(it.unitPrice ?? 0)),
            productId: it.productId ? it.productId : null,
          })),
        });
      } else {
        const current = await tx.invoice.findUnique({
          where: { id },
          select: { subtotal: true, taxAmount: true, discountAmount: true },
        });
        subtotal = current?.subtotal ?? new Prisma.Decimal(0);
        if ((body as any).taxAmount === undefined)
          taxAmount = current?.taxAmount ?? toDec(0);
        if ((body as any).discountAmount === undefined)
          discountAmount = current?.discountAmount ?? toDec(0);
      }

      const total = subtotal.add(taxAmount).sub(discountAmount);

      const invUpdated = await tx.invoice.update({
        where: { id },
        data: {
          ...(body.clientId ? { clientId: body.clientId } : {}),
          ...(body.invoiceNumber
            ? { invoiceNumber: safeTrim(body.invoiceNumber) }
            : {}),
          ...(body.issueDate ? { issueDate: new Date(body.issueDate) } : {}),
          ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
          ...(body.paymentTerms !== undefined
            ? { paymentTerms: body.paymentTerms || null }
            : {}),
          ...(body.currency ? { currency: body.currency } : {}),
          ...(body.notes !== undefined ? { notes: body.notes || null } : {}),

          subtotal,
          taxAmount,
          discountAmount,
          total,
        },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });

      return invUpdated;
    });

    return updated;
  };

  updateStatus = async (
    userId: string,
    id: string,
    body: UpdateInvoiceStatusDTO,
  ) => {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!inv) throw new ApiError("Invoice not found", 404);

    const status = body.status as InvoiceStatus;

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status },
    });

    return updated;
  };

  sendInvoiceEmail = async (userId: string, id: string) => {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        client: true,
        items: { include: { product: true } },
        user: { include: { profile: true } },
      },
    });

    if (!inv) throw new ApiError("Invoice not found", 404);

    if (
      inv.status === "SENT" ||
      inv.status === "PAID" ||
      inv.status === "OVERDUE"
    ) {
      throw new ApiError(
        `Invoice sudah ${inv.status}. Tidak bisa kirim lagi.`,
        400,
      );
    }

    const toEmail = safeTrim(inv.client?.email ?? "");
    if (!toEmail) throw new ApiError("Client email is required", 400);

    const subject = `Invoice ${inv.invoiceNumber}`;

    const emailLog = await this.prisma.invoiceEmail.create({
      data: {
        invoiceId: inv.id,
        toEmail,
        subject,
        status: EmailStatus.QUEUED,
      },
    });

    try {
      const companyName =
        safeTrim(inv.user?.profile?.companyName) || "Invoice App";

      // ✅ FIX: provide both key styles so invoice-email.hbs & invoice.hbs work
      const items = (inv.items ?? []).map((it: any) => {
        const qtyNum = toNum(it.quantity);
        const unitPriceNum = toNum(it.unitPrice);
        const lineTotalNum = toNum(it.lineTotal);

        return {
          // label
          name: it.itemName || it.product?.name || "Item",
          description: it.description ?? "",

          // invoice-email.hbs keys
          qty: String(qtyNum),
          price: this.formatIDR(unitPriceNum),
          lineTotal: this.formatIDR(lineTotalNum),

          // invoice.hbs keys
          quantity: String(qtyNum),
          unitPrice: this.formatIDR(unitPriceNum),
        };
      });

      const context = {
        companyName,
        clientName: inv.client?.name ?? "Client",
        clientEmail: toEmail,
        clientAddress: (inv.client as any)?.address ?? "",

        // optional fields for other template
        clientPhone: (inv.client as any)?.phone ?? "",
        status: String(inv.status ?? "DRAFT").toUpperCase(),
        senderName: safeTrim((inv.user as any)?.name ?? "") || "Invoice App",
        companyAddress: safeTrim(inv.user?.profile?.companyAddress ?? ""),
        senderPhone: safeTrim(inv.user?.profile?.phone ?? ""),

        invoiceNumber: inv.invoiceNumber,
        issueDate: String(inv.issueDate).slice(0, 10),
        dueDate: String(inv.dueDate).slice(0, 10),
        currency: inv.currency ?? "IDR",
        items,

        // ✅ FIX: now Decimal -> number works
        subtotal: this.formatIDR(inv.subtotal),
        taxAmount: this.formatIDR(inv.taxAmount),
        discountAmount: this.formatIDR(inv.discountAmount),
        total: this.formatIDR(inv.total),

        notes: inv.notes ?? "",
      };

      await this.mail.sendEmail(toEmail, subject, "invoice-email", context);

      await this.prisma.invoiceEmail.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      const updatedInvoice = await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "SENT" },
        include: {
          client: true,
          items: { include: { product: true } },
          emails: true,
          payments: true,
        },
      });

      return updatedInvoice;
    } catch (err: any) {
      await this.prisma.invoiceEmail.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: err?.message ?? "Failed to send email",
        },
      });

      throw new ApiError(err?.message ?? "Failed to send email", 500);
    }
  };

  cancel = async (userId: string, invoiceId: string) => {
    if (!invoiceId) throw new ApiError("invoiceId is required", 400);

    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { id: true, status: true },
    });

    if (!inv) throw new ApiError("Invoice not found", 404);

    const status = String(inv.status ?? "").toUpperCase();

    if (status === "PAID") throw new ApiError("Invoice already PAID", 400);
    if (status === "CANCELLED")
      throw new ApiError("Invoice already CANCELLED", 400);

    if (status !== "DRAFT" && status !== "SENT") {
      throw new ApiError("Only DRAFT or SENT invoices can be cancelled", 400);
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "CANCELLED" as any },
    });

    return {
      message: "Invoice cancelled",
      data: updated,
    };
  };
}
