import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateRecurringDTO {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  templateInvoiceId?: string;

  @IsOptional()
  @IsIn(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsString()
  nextRunAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
