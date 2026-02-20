import { IsBoolean } from "class-validator";

export class ToggleRecurringDTO {
  @IsBoolean()
  isActive!: boolean;
}
