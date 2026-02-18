import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateInvoiceItemDTO {
  // ✅ FIX: id item juga CUID/string
  @IsOptional()
  @IsString()
  id?: string;

  /**
   * Prisma: itemName wajib.
   * Tapi supaya PATCH fleksibel (kamu bisa kirim description saja),
   * kita buat itemName optional dan akan "fallback" di service (Item).
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  itemName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // kalau items dikirim, quantity wajib
  @ValidateIf((o) => o.quantity !== undefined)
  @IsNumber()
  @Min(1)
  quantity?: number;

  // kalau items dikirim, unitPrice wajib
  @ValidateIf((o) => o.unitPrice !== undefined)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  // ✅ FIX: productId juga CUID/string
  @IsOptional()
  @IsString()
  productId?: string;
}

export class UpdateInvoiceDTO {
  // ✅ FIX: clientId juga CUID/string
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * items optional.
   * Kalau items dikirim, service akan replace items.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDTO)
  items?: UpdateInvoiceItemDTO[];
}
