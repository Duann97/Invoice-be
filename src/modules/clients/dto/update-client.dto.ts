import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateClientDTO {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(190)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  notes?: string;
}
