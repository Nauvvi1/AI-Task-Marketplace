import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  telegramId!: string;

  @IsString()
  serviceCode!: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, string>;
}
