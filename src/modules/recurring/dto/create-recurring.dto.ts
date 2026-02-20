import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateRecurringDTO {
  @IsString()
  clientId!: string;

  @IsString()
  templateInvoiceId!: string;

  @IsIn(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
  frequency!: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

  @IsInt()
  @Min(1)
  interval!: number;

  @IsISO8601()
  startAt!: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
