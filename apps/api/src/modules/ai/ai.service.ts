import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Order } from '@prisma/client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  async generateForOrder(
    order: Pick<Order, 'id' | 'inputJson' | 'summaryJson'> & {
      serviceCode: string;
      serviceTitle: string;
    },
  ) {
    if (!this.client) {
      return this.generateMock(order);
    }

    const prompt = [
      'You are Nauvvi, an AI execution engine for structured Telegram creator deliverables.',
      'Return strictly valid JSON only.',
      `Service: ${order.serviceTitle} (${order.serviceCode})`,
      `Brief: ${JSON.stringify(order.inputJson)}`,
      'The output must be useful, concise, commercial, and Telegram-native.',
    ].join('\n');

    try {
      const response = await this.client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: prompt,
      });

      const text = response.output_text?.trim() || '{}';

      try {
        return JSON.parse(text);
      } catch {
        this.logger.warn('OpenAI returned non-JSON, falling back to mock formatter');
        return this.generateMock(order, text);
      }
    } catch (error) {
      this.logger.error(
        'OpenAI call failed, returning mock output',
        error instanceof Error ? error.stack : String(error),
      );
      return this.generateMock(order);
    }
  }

  private generateMock(
    order: Pick<Order, 'id' | 'inputJson'> & {
      serviceCode: string;
      serviceTitle: string;
    },
    rawText?: string,
  ) {
    const input = (order.inputJson || {}) as Record<string, string>;
    const topic =
      input.topic ||
      input.productName ||
      input.brandName ||
      input.product ||
      'your project';
    const audience = input.audience || 'your audience';

    switch (order.serviceCode) {
      case 'telegram-launch-pack':
        return {
          titles: [
            `Launching ${topic} today`,
            `${topic}: what you need to know`,
            `Meet ${topic}`,
            `A new drop for ${audience}`,
            `Why ${topic} matters now`,
          ],
          posts: [
            `We are launching ${topic} for ${audience}. Built to solve a real pain point and keep the message clear, fast, and useful. ${input.cta || 'Join now.'}`,
            `Today we open access to ${topic}. Expect a clean product, practical value, and content designed for ${audience}. ${input.cta || 'Check it out.'}`,
            `${topic} is live. If you care about speed, clarity, and results, this is built for you. ${input.cta || 'Learn more.'}`,
          ],
          hooks: Array.from(
            { length: 10 },
            (_, i) => `Hook ${i + 1}: A sharper angle for ${topic}`,
          ),
          cta: input.cta || 'Open, read, and take action today.',
          hashtags: ['#telegram', '#launch', '#creator', '#marketing', '#ton'],
          note: rawText || undefined,
        };

      case 'translate-localize':
        return {
          translation: `[${input.targetLanguage || 'Target language'}] ${input.sourceText || ''}`,
          localizedVersion: `Localized for ${audience}: ${input.sourceText || ''}`,
          alternativeVersion: `Alternative tone variant for ${input.targetLanguage || 'target language'}.`,
        };

      default:
        return {
          result: `${order.serviceTitle} completed for ${topic}.`,
          bullets: [
            `Audience: ${audience}`,
            'Structured output delivered',
            'Ready to use in Telegram',
          ],
          note: rawText || undefined,
        };
    }
  }
}