import { Transform } from "class-transformer";
import { IsOptional, IsBoolean, IsString } from "class-validator";

export class GetProductsDTO {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

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
