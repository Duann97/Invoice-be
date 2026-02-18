import { IsOptional, IsString } from "class-validator";

export class RunRecurringDTO {
  @IsOptional()
  @IsString()
  id?: string; // optional: run 1 recurring by id
}
