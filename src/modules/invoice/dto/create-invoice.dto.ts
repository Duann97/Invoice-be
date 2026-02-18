import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateInvoiceItemDTO {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  @MinLength(10) // cuid biasanya panjang, ini sekadar guard
  productId?: string;
}

export class CreateInvoiceDTO {
  @IsString()
  @MinLength(10)
  clientId!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDTO)
  items!: CreateInvoiceItemDTO[];
}
