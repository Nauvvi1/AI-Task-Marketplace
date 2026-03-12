import { IsObject } from 'class-validator';

export class UpdateBriefDto {
  @IsObject()
  input!: Record<string, string>;
}
