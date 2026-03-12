import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private assertSecret(secret?: string) {
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException('Invalid admin secret');
    }
  }

  @Get('orders')
  async listOrders(@Headers('x-admin-secret') secret?: string) {
    this.assertSecret(secret);
    return this.prisma.order.findMany({ include: { service: true, user: true, paymentIntents: true }, orderBy: { createdAt: 'desc' } });
  }

  @Get('payments')
  async listPayments(@Headers('x-admin-secret') secret?: string) {
    this.assertSecret(secret);
    return this.prisma.paymentIntent.findMany({ include: { order: true }, orderBy: { createdAt: 'desc' } });
  }
}
