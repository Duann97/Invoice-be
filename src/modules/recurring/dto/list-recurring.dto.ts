import { IsIn, IsInt, IsOptional, Min } from "class-validator";

export class ListRecurringDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  // "all" | "active" | "inactive"
  @IsOptional()
  @IsIn(["all", "active", "inactive"])
  active?: "all" | "active" | "inactive";
}
