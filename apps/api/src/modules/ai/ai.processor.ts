import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { AiService } from './ai.service';

@Processor('generation')
export class AiProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    const order = await this.prisma.order.findUnique({
      where: { id: job.data.orderId },
      include: { service: true, user: true },
    });

    if (!order) return;

    await this.prisma.generationJob.create({
      data: {
        orderId: order.id,
        status: 'Running',
        attempts: job.attemptsMade + 1,
        modelName: process.env.OPENAI_MODEL || 'mock-model',
        promptVersion: order.service.promptTemplateVersion,
        startedAt: new Date(),
      },
    });

    await this.ordersService.setOrderInProgress(order.id);

    try {
      const output = await this.aiService.generateForOrder({
        id: order.id,
        inputJson: order.inputJson,
        summaryJson: order.summaryJson,
        serviceCode: order.service.code,
        serviceTitle: order.service.title,
      });

      await this.ordersService.completeOrder(
        order.id,
        output as Prisma.InputJsonValue,
      );

      await this.prisma.generationJob.create({
        data: {
          orderId: order.id,
          status: 'Completed',
          attempts: job.attemptsMade + 1,
          modelName: process.env.OPENAI_MODEL || 'mock-model',
          promptVersion: order.service.promptTemplateVersion,
          finishedAt: new Date(),
        },
      });
    } catch (error) {
      await this.ordersService.failOrder(order.id, (error as Error).message);
      throw error;
    }
  }
}