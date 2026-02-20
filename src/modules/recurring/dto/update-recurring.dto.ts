import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Min,
} from "class-validator";

export class UpdateRecurringDTO {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsISO8601()
  endAt?: string; // null handling kita urus di service (kalau butuh)
}
