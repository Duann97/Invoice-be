import { IsIn, IsOptional, IsString } from "class-validator";

export class ListRecurringDTO {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsIn(["true", "false"])
  isActive?: "true" | "false";

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
