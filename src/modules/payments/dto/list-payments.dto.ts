import { IsISO8601, IsIn, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class ListPaymentsDTO {
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  limit?: number;

  // optional sorting
  @IsOptional()
  @IsIn(["asc", "desc"])
  sort?: "asc" | "desc";
}
