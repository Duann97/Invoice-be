import { IsInt, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class GetDashboardDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-24)
  @Max(24)
  monthOffset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  dueSoonDays?: number = 7;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;
}
