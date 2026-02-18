import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileDTO {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;
}
