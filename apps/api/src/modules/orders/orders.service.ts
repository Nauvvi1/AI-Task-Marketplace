import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateBriefDto } from './dto/update-brief.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly usersService: UsersService,
    @InjectQueue('generation') private readonly generationQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const service = await this.catalogService.getServiceByCode(dto.serviceCode);
    if (!service) throw new NotFoundException('Service not found');

    const user = await this.usersService.upsertTelegramUser({ telegramId: dto.telegramId });
    const publicOrderNo = `NV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        publicOrderNo,
        userId: user.id,
        serviceId: service.id,
        status: dto.input ? 'AwaitingPayment' : 'Draft',
        inputJson: dto.input || undefined,
        priceTon: service.priceTon,
        summaryJson: dto.input
          ? {
              serviceCode: service.code,
              serviceTitle: service.title,
              priceTon: Number(service.priceTon),
              etaSeconds: service.etaSeconds,
              deliverables: service.outputSchemaJson,
              brief: dto.input,
            }
          : undefined,
      },
      include: { service: true },
    });

    return order;
  }

  async updateBrief(orderId: string, dto: UpdateBriefDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { service: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'Draft' && order.status !== 'AwaitingPayment') {
      throw new BadRequestException('Brief can only be updated before payment');
    }

    const summaryJson = {
      serviceCode: order.service.code,
      serviceTitle: order.service.title,
      priceTon: Number(order.priceTon),
      etaSeconds: order.service.etaSeconds,
      deliverables: order.service.outputSchemaJson,
      brief: dto.input,
    };

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        inputJson: dto.input,
        summaryJson,
        status: 'AwaitingPayment',
      },
    });
  }

  async listOrdersByTelegramId(telegramId: string) {
    return this.prisma.order.findMany({
      where: { user: { telegramId } },
      orderBy: { createdAt: 'desc' },
      include: { service: true, paymentIntents: true },
    });
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { service: true, paymentIntents: true, generationJobs: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async markOrderPaid(orderId: string, txHash?: string) {
    const order = await this.getOrderById(orderId);
    if (order.status === 'Paid' || order.status === 'InProgress' || order.status === 'Completed') return order;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Paid',
        paidAt: new Date(),
      },
    });

    await this.generationQueue.add(
      'generate-order',
      { orderId: order.id, txHash },
      { attempts: 2, removeOnComplete: 50, removeOnFail: 100 },
    );

    return updatedOrder;
  }

  async setOrderInProgress(orderId: string) {
    return this.prisma.order.update({ where: { id: orderId }, data: { status: 'InProgress' } });
  }

  async completeOrder(orderId: string, outputJson: Prisma.InputJsonValue) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Completed',
        outputJson,
        completedAt: new Date(),
      },
    });
  }

  async failOrder(orderId: string, errorMessage: string) {
    await this.prisma.generationJob.create({
      data: { orderId, status: 'Failed', attempts: 1, errorMessage, finishedAt: new Date() },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'Failed', failedAt: new Date() },
    });
  }

  async regenerateOrder(orderId: string) {
    const order = await this.getOrderById(orderId);
    if (order.regenerateUsed) throw new BadRequestException('Regenerate already used');
    if (order.status !== 'Completed') throw new BadRequestException('Only completed orders can be regenerated');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        regenerateUsed: true,
        status: 'Paid',
        outputJson: undefined,
        completedAt: null,
      },
    });

    await this.generationQueue.add('generate-order', { orderId: order.id, regenerate: true }, { attempts: 2 });
    return { ok: true };
  }
}