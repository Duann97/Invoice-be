import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum RecurringFrequencyDTO {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export class CreateRecurringDTO {
  @IsString()
  clientId!: string;

  @IsString()
  templateInvoiceId!: string;

  @IsEnum(RecurringFrequencyDTO)
  frequency!: RecurringFrequencyDTO;

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
