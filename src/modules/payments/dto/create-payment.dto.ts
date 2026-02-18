import { IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class CreatePaymentDTO {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  // terima string/number, tapi kita simpan sebagai number untuk service
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? value
      : Number(value),
  )
  @IsNotEmpty()
  amount!: number;

  // optional: kalau kosong -> now()
  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
