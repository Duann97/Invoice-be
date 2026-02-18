import { IsIn } from "class-validator";

export class UpdateInvoiceStatusDTO {
  @IsIn(["DRAFT", "SENT", "PENDING", "PAID", "OVERDUE", "CANCELLED"])
  status!: "DRAFT" | "SENT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
}
