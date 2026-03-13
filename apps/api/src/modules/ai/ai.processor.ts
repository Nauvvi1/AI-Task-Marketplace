import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import axios from 'axios';
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

      const completedOrder = await this.ordersService.completeOrder(
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

      await this.sendCompletionToTelegram({
        telegramId: order.user.telegramId,
        orderId: order.id,
        publicOrderNo: order.publicOrderNo,
        serviceTitle: order.service.title,
        serviceCode: order.service.code,
        output,
      });
    } catch (error) {
      await this.ordersService.failOrder(order.id, (error as Error).message);
      throw error;
    }
  }

  private async sendCompletionToTelegram(params: {
    telegramId: string;
    orderId: string;
    publicOrderNo: string;
    serviceTitle: string;
    serviceCode: string;
    output: any;
  }) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;
  
    const text = this.formatCompletionMessage(params);
  
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: params.telegramId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'View Result', callback_data: `result:${params.orderId}` }],
          [{ text: 'View Order', callback_data: `order:${params.orderId}` }],
          [{ text: 'My Orders', callback_data: 'menu:orders' }],
        ],
      },
    });
  }
  
  private formatCompletionMessage(params: {
    publicOrderNo: string;
    serviceTitle: string;
    serviceCode: string;
    output: any;
  }) {
    const out = params.output || {};
  
    if (params.serviceCode === 'telegram-launch-pack') {
      const titles = Array.isArray(out.titles) ? out.titles.map((t: string) => `• ${this.escapeHtml(t)}`).join('\n') : '—';
      const posts = Array.isArray(out.posts)
        ? out.posts.map((p: string, i: number) => `${i + 1}. ${this.escapeHtml(p)}`).join('\n\n')
        : '—';
      const hooks = Array.isArray(out.hooks)
        ? out.hooks.map((h: string) => `• ${this.escapeHtml(h)}`).join('\n')
        : '—';
      const hashtags = Array.isArray(out.hashtags)
        ? out.hashtags.map((h: string) => this.escapeHtml(h)).join(' ')
        : '—';
      const cta = out.cta ? this.escapeHtml(out.cta) : '—';
  
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        '🔥 <b>Titles</b>',
        titles,
        '',
        '✍️ <b>Launch Posts</b>',
        posts,
        '',
        '⚡ <b>Hooks</b>',
        hooks,
        '',
        `<b>CTA</b>\n${cta}`,
        '',
        `<b>Hashtags</b>\n${hashtags}`,
      ].join('\n');
    }
  
    if (params.serviceCode === 'telegram-post-pack') {
      const titles = Array.isArray(out.titles) ? out.titles.map((t: string) => `• ${this.escapeHtml(t)}`).join('\n') : '—';
      const posts = Array.isArray(out.posts)
        ? out.posts.map((p: string, i: number) => `${i + 1}. ${this.escapeHtml(p)}`).join('\n\n')
        : '—';
      const hooks = Array.isArray(out.hooks)
        ? out.hooks.map((h: string) => `• ${this.escapeHtml(h)}`).join('\n')
        : '—';
  
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        '🔥 <b>Titles</b>',
        titles,
        '',
        '✍️ <b>Post Variants</b>',
        posts,
        '',
        '⚡ <b>Hooks</b>',
        hooks,
      ].join('\n');
    }
  
    if (params.serviceCode === 'product-sales-pack') {
      const benefits = Array.isArray(out.benefits)
        ? out.benefits.map((b: string) => `• ${this.escapeHtml(b)}`).join('\n')
        : '—';
  
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        `<b>Short Description</b>\n${this.escapeHtml(out.shortDescription || '—')}`,
        '',
        `<b>Full Description</b>\n${this.escapeHtml(out.fullDescription || '—')}`,
        '',
        `<b>Benefits</b>\n${benefits}`,
        '',
        `<b>CTA</b>\n${this.escapeHtml(out.cta || '—')}`,
      ].join('\n');
    }
  
    if (params.serviceCode === 'ad-copy-pack') {
      const adCopies = Array.isArray(out.adCopies)
        ? out.adCopies.map((a: string, i: number) => `${i + 1}. ${this.escapeHtml(a)}`).join('\n\n')
        : '—';
      const hooks = Array.isArray(out.hooks)
        ? out.hooks.map((h: string) => `• ${this.escapeHtml(h)}`).join('\n')
        : '—';
      const ctas = Array.isArray(out.ctas)
        ? out.ctas.map((c: string) => `• ${this.escapeHtml(c)}`).join('\n')
        : '—';
  
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        '<b>Ad Copies</b>',
        adCopies,
        '',
        '<b>Hooks</b>',
        hooks,
        '',
        '<b>CTAs</b>',
        ctas,
      ].join('\n');
    }
  
    if (params.serviceCode === 'translate-localize') {
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        `<b>Translation</b>\n${this.escapeHtml(out.translation || '—')}`,
        '',
        `<b>Localized version</b>\n${this.escapeHtml(out.localizedVersion || '—')}`,
        '',
        `<b>Alternative version</b>\n${this.escapeHtml(out.alternativeVersion || '—')}`,
      ].join('\n');
    }
  
    if (params.serviceCode === 'brand-starter-pack') {
      const slogans = Array.isArray(out.slogans)
        ? out.slogans.map((s: string) => `• ${this.escapeHtml(s)}`).join('\n')
        : '—';
  
      return [
        `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
        `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
        '',
        `<b>Positioning</b>\n${this.escapeHtml(out.positioning || '—')}`,
        '',
        `<b>Value Proposition</b>\n${this.escapeHtml(out.valueProposition || '—')}`,
        '',
        `<b>Slogans</b>\n${slogans}`,
        '',
        `<b>Tone of Voice</b>\n${this.escapeHtml(out.toneOfVoice || '—')}`,
        '',
        `<b>Brand Bio</b>\n${this.escapeHtml(out.brandBio || '—')}`,
      ].join('\n');
    }
  
    const bullets = Array.isArray(out.bullets)
      ? out.bullets.map((b: string) => `• ${this.escapeHtml(b)}`).join('\n')
      : '';
  
    return [
      `✅ <b>${this.escapeHtml(params.serviceTitle)} is ready</b>`,
      `Order: <b>${this.escapeHtml(params.publicOrderNo)}</b>`,
      '',
      this.escapeHtml(out.result || 'Your result is ready.'),
      '',
      bullets,
    ].join('\n');
  }

  private escapeHtml(value: string) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}