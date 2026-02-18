import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
} from "class-validator";

export class UpdateProductDTO {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  // allow set null (hapus category) bisa via empty string di FE
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
