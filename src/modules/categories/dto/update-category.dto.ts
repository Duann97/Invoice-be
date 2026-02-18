import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCategoryDTO {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;
}
