import { Transform } from "class-transformer";
import { IsOptional, IsBoolean } from "class-validator";

export class GetCategoriesDTO {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    const v = String(value).toLowerCase().trim();
    return v === "true" || v === "1" || v === "yes";
  })
  @IsBoolean()
  includeDeleted?: boolean;
}
