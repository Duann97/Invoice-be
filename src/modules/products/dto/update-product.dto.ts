import { IsOptional, IsString, IsNumber, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

const toNumberOrUndefined = (v: any) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;

  if (typeof v === "string") {
    // support "1.000.000" / "1,000,000" / "IDR 1.000.000"
    const cleaned = v.replace(/[^\d.-]/g, "");
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }

  return undefined;
};

export class UpdateProductDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  unit?: string | null;

  // ✅ field utama yang dipakai backend + list FE
  @IsOptional()
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsNumber()
  unitPrice?: number;

  // ✅ backward compatibility kalau FE kirim "price"
  @IsOptional()
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  // kalau DTO kamu sebelumnya punya ini, biarin. kalau nggak ada pun gapapa.
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}
