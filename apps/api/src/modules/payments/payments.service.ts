import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TonService } from '../ton/ton.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly tonService: TonService,
  ) {}

  async createPaymentIntent(orderId: string) {
    const order = await this.ordersService.getOrderById(orderId);
    if (!order.summaryJson) throw new BadRequestException('Order brief is incomplete');
    if (!['AwaitingPayment', 'PaymentPending'].includes(order.status)) {
      throw new BadRequestException('Order is not ready for payment');
    }

    const amountTon = Number(order.priceTon);
    const destinationAddress = process.env.TON_RECEIVER_ADDRESS || 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
    const paymentComment = `nauvvi:${order.publicOrderNo}:${order.id}`;
    const payload = this.tonService.buildTonConnectPayload({
      amountTon,
      destinationAddress,
      comment: paymentComment,
    });

    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        orderId: order.id,
        amountTon,
        destinationAddress,
        paymentComment,
        tonConnectPayload: payload,
        status: 'AwaitingWallet',
      },
    });

    await this.prisma.order.update({ where: { id: order.id }, data: { status: 'PaymentPending' } });
    return paymentIntent;
  }

  async getPaymentIntent(id: string) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({ where: { id } });
    if (!paymentIntent) throw new NotFoundException('Payment intent not found');
    return paymentIntent;
  }

  async confirmPayment(paymentIntentId: string, txHash?: string) {
    const paymentIntent = await this.getPaymentIntent(paymentIntentId);
    if (paymentIntent.status === 'Confirmed') return paymentIntent;

    const updated = await this.prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: 'Confirmed',
        txHash: txHash || `demo_${Date.now()}`,
        confirmedAt: new Date(),
      },
    });

    await this.ordersService.markOrderPaid(paymentIntent.orderId, updated.txHash || undefined);
    return updated;
  }
}
