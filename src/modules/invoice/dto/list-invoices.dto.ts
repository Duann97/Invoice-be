import { IsIn, IsOptional, IsString } from "class-validator";

export class ListInvoicesDTO {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string; // validate in service against enum list

  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO

  @IsOptional()
  @IsString()
  dateTo?: string; // ISO

  // ✅ FIX: clientId itu CUID (string), bukan UUID
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  page?: string; // parseInt di service

  @IsOptional()
  @IsString()
  limit?: string; // parseInt di service
}
