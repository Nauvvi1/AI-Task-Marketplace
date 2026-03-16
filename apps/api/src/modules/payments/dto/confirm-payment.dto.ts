import { IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentIntentId!: string;

  @IsOptional()
  @IsString()
  boc?: string;

  @IsOptional()
  @IsString()
  senderAddress?: string;

  @IsOptional()
  @IsString()
  txHash?: string;
}