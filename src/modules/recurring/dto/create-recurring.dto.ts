import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateRecurringDTO {
  @IsString()
  clientId!: string; // cuid

  @IsOptional()
  @IsString()
  templateInvoiceId?: string; // cuid

  @IsIn(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
  frequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number = 1;

  @IsString()
  startAt!: string; // ISO string

  @IsOptional()
  @IsString()
  endAt?: string; // ISO string

  @IsOptional()
  @IsString()
  nextRunAt?: string; // ISO string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
