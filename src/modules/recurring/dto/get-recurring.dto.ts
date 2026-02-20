import { IsOptional, IsString } from "class-validator";

export class GetRecurringDTO {
  @IsOptional()
  @IsString()
  active?: string; // "true" | "false" | undefined

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
