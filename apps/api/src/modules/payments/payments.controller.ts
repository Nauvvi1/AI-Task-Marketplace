import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intents')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto.orderId);
  }

  @Get('intents/:id')
  getIntent(@Param('id') id: string) {
    return this.paymentsService.getPaymentIntent(id);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(
      dto.paymentIntentId,
      dto.boc,
      dto.senderAddress,
    );
  }
}
