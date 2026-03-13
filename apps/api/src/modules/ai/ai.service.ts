import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Order } from '@prisma/client';

type ServiceSchema = {
  name: string;
  schema: Record<string, any>;
};

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

    const schema = this.getSchemaForService(order.serviceCode);
    const instructions = this.buildInstructions(order);

    try {
      const result = await this.generateStructured(order, instructions, schema);

      if (this.isWeakResult(order.serviceCode, result)) {
        this.logger.warn(`Weak structured result for ${order.serviceCode}, retrying once`);
        const retryInstructions =
          instructions +
          '\n\nIMPORTANT: Avoid generic filler. Be specific, natural, commercially useful, and varied.';

        const retried = await this.generateStructured(order, retryInstructions, schema);

        if (!this.isWeakResult(order.serviceCode, retried)) {
          return retried;
        }

        return retried;
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Structured generation failed, returning fallback output',
        error instanceof Error ? error.stack : String(error),
      );
      return this.generateMock(order);
    }
  }

  private async generateStructured(
    order: Pick<Order, 'id' | 'inputJson' | 'summaryJson'> & {
      serviceCode: string;
      serviceTitle: string;
    },
    instructions: string,
    serviceSchema: ServiceSchema,
  ) {
    const response = await this.client!.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `Service: ${order.serviceTitle} (${order.serviceCode})`,
                `Brief JSON: ${JSON.stringify(order.inputJson || {})}`,
              ].join('\n'),
            },
          ],
        },
      ],
      instructions,
      text: {
        format: {
          type: 'json_schema',
          name: serviceSchema.name,
          strict: true,
          schema: serviceSchema.schema,
        },
      },
    });

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error('Empty model output');
    }

    return JSON.parse(text);
  }

  private buildInstructions(
    order: Pick<Order, 'id' | 'inputJson' | 'summaryJson'> & {
      serviceCode: string;
      serviceTitle: string;
    },
  ) {
    const input = (order.inputJson || {}) as Record<string, string>;

    const common = [
      'You are Nauvvi, a premium AI execution engine for Telegram-native creator and commerce deliverables.',
      'Your job is to produce polished, useful, practical output that can be used immediately.',
      'Never output markdown, code fences, explanations, labels outside the schema, or meta commentary.',
      'Do not apologize. Do not say you are an AI.',
      'Avoid generic filler, repetition, and placeholders.',
      'Write naturally, with strong product sense and commercial clarity.',
    ];

    switch (order.serviceCode) {
      case 'telegram-launch-pack':
        return [
          ...common,
          'Write launch-ready Telegram content.',
          'Titles must be varied and non-repetitive.',
          'Posts must feel like real Telegram announcements, not generic landing page copy.',
          'Hooks must be short, sharp, and distinct.',
          'Use the provided offer, audience, tone, and CTA.',
          `Topic: ${input.topic || ''}`,
          `Offer: ${input.offer || ''}`,
          `Audience: ${input.audience || ''}`,
          `Tone: ${input.tone || ''}`,
          `CTA: ${input.cta || ''}`,
        ].join('\n');

      case 'telegram-post-pack':
        return [
          ...common,
          'Write 3 distinct Telegram post variants for an ongoing channel content plan.',
          'Each post must feel natively written for Telegram.',
          'Each post should be concise, readable, and ready to publish.',
          'Do not write long article-style blocks.',
          'Headlines and hooks must be varied and useful.',
          `Topic: ${input.topic || ''}`,
          `Audience: ${input.audience || ''}`,
          `Tone: ${input.tone || ''}`,
        ].join('\n');

      case 'product-sales-pack':
        return [
          ...common,
          'Write sharp, commercially useful selling copy for a Telegram-based product pitch.',
          'The short description should be concise and punchy.',
          'The full description should be more detailed and persuasive.',
          'Benefits must be concrete and user-centered.',
          `Product: ${input.productName || ''}`,
          `Features: ${input.features || ''}`,
          `Audience: ${input.audience || ''}`,
        ].join('\n');

      case 'ad-copy-pack':
        return [
          ...common,
          'Write compact ad copy suitable for Telegram promotions.',
          'Ad copies must feel promotional but not spammy.',
          'Hooks must be crisp and varied.',
          'CTA options must feel realistic and clickable.',
          `Product: ${input.product || ''}`,
          `Offer: ${input.offer || ''}`,
          `Audience: ${input.audience || ''}`,
        ].join('\n');

      case 'translate-localize':
        return [
          ...common,
          'Translate the source text into the requested target language.',
          'Return three fields:',
          '1) translation: accurate direct translation',
          '2) localizedVersion: a more natural localized version for the target audience',
          '3) alternativeVersion: a second natural variant in the requested tone',
          'All three fields must be fully written in the target language.',
          'Never keep the output in the source language unless a proper noun must remain unchanged.',
          `Source text: ${input.sourceText || ''}`,
          `Target language: ${input.targetLanguage || ''}`,
          `Tone: ${input.tone || 'natural and professional'}`,
        ].join('\n');

      case 'brand-starter-pack':
        return [
          ...common,
          'Write a concise but premium brand starter pack.',
          'Positioning should feel strategic and commercially sharp.',
          'Value proposition must be clear and concrete.',
          'Slogans must be varied, short, and usable.',
          'Brand bio should sound product-ready, not generic.',
          `Brand name: ${input.brandName || ''}`,
          `Niche: ${input.niche || ''}`,
          `Audience: ${input.audience || ''}`,
        ].join('\n');

      default:
        return common.join('\n');
    }
  }

  private getSchemaForService(serviceCode: string): ServiceSchema {
    switch (serviceCode) {
      case 'telegram-launch-pack':
        return {
          name: 'telegram_launch_pack',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              titles: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
              posts: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: { type: 'string' },
              },
              hooks: {
                type: 'array',
                minItems: 10,
                maxItems: 10,
                items: { type: 'string' },
              },
              cta: { type: 'string' },
              hashtags: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
            },
            required: ['titles', 'posts', 'hooks', 'cta', 'hashtags'],
          },
        };

      case 'telegram-post-pack':
        return {
          name: 'telegram_post_pack',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              titles: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
              posts: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: { type: 'string' },
              },
              hooks: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
            },
            required: ['titles', 'posts', 'hooks'],
          },
        };

      case 'product-sales-pack':
        return {
          name: 'product_sales_pack',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              shortDescription: { type: 'string' },
              fullDescription: { type: 'string' },
              benefits: {
                type: 'array',
                minItems: 4,
                maxItems: 6,
                items: { type: 'string' },
              },
              cta: { type: 'string' },
            },
            required: ['shortDescription', 'fullDescription', 'benefits', 'cta'],
          },
        };

      case 'ad-copy-pack':
        return {
          name: 'ad_copy_pack',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              adCopies: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
              hooks: {
                type: 'array',
                minItems: 10,
                maxItems: 10,
                items: { type: 'string' },
              },
              ctas: {
                type: 'array',
                minItems: 3,
                maxItems: 3,
                items: { type: 'string' },
              },
            },
            required: ['adCopies', 'hooks', 'ctas'],
          },
        };

      case 'translate-localize':
        return {
          name: 'translate_localize',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              translation: { type: 'string' },
              localizedVersion: { type: 'string' },
              alternativeVersion: { type: 'string' },
            },
            required: ['translation', 'localizedVersion', 'alternativeVersion'],
          },
        };

      case 'brand-starter-pack':
        return {
          name: 'brand_starter_pack',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              positioning: { type: 'string' },
              valueProposition: { type: 'string' },
              slogans: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
              toneOfVoice: { type: 'string' },
              brandBio: { type: 'string' },
            },
            required: ['positioning', 'valueProposition', 'slogans', 'toneOfVoice', 'brandBio'],
          },
        };

      default:
        return {
          name: 'generic_result',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              result: { type: 'string' },
              bullets: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: { type: 'string' },
              },
            },
            required: ['result', 'bullets'],
          },
        };
    }
  }

  private isWeakResult(serviceCode: string, result: any) {
    if (!result || typeof result !== 'object') return true;

    if (serviceCode === 'translate-localize') {
      const t = String(result.translation || '');
      const l = String(result.localizedVersion || '');
      const a = String(result.alternativeVersion || '');

      if (!t || !l || !a) return true;
      if (t.includes('[German]') || l.startsWith('Localized for') || a.startsWith('Alternative tone variant')) {
        return true;
      }
    }

    if (serviceCode === 'telegram-launch-pack') {
      if (!Array.isArray(result.titles) || !Array.isArray(result.posts) || !Array.isArray(result.hooks)) {
        return true;
      }
      if (result.titles.length < 5 || result.posts.length < 3 || result.hooks.length < 10) {
        return true;
      }
    }

    return false;
  }

  private generateMock(
    order: Pick<Order, 'id' | 'inputJson'> & {
      serviceCode: string;
      serviceTitle: string;
    },
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
            `Introducing ${topic}`,
            `Why ${topic} matters now`,
            `${topic}: built for ${audience}`,
            `A smarter launch for ${audience}`,
            `Meet ${topic} today`,
          ],
          posts: [
            `${topic} is launching for ${audience}. Clear value, strong positioning, and a practical reason to act now. ${input.cta || 'Join now.'}`,
            `Today we’re opening access to ${topic}. Designed for ${audience}, focused on clarity, speed, and useful outcomes. ${input.cta || 'Explore it now.'}`,
            `If you’ve been waiting for a cleaner way to solve this problem, ${topic} is here. Built for ${audience}. ${input.cta || 'Take a look.'}`,
          ],
          hooks: [
            `A launch built for ${audience}`,
            `Why ${topic} deserves attention`,
            `A faster way to move with ${topic}`,
            `What makes ${topic} different`,
            `Built with clarity, not noise`,
            `A practical new option for ${audience}`,
            `Strong positioning, simple message`,
            `Useful from day one`,
            `Made for action, not hype`,
            `A sharper launch story`,
          ],
          cta: input.cta || 'Open, read, and take action today.',
          hashtags: ['#telegram', '#launch', '#creator', '#marketing', '#ton'],
        };

      case 'translate-localize':
        return {
          translation: 'Bitte erneut versuchen: strukturierte Übersetzung konnte nicht zuverlässig generiert werden.',
          localizedVersion: 'Bitte erneut versuchen: lokalisierte Fassung konnte nicht zuverlässig generiert werden.',
          alternativeVersion: 'Bitte erneut versuchen: alternative Sprachversion konnte nicht zuverlässig generiert werden.',
        };

      case 'product-sales-pack':
        return {
          shortDescription: `${topic} is designed for ${audience} and highlights the core value clearly.`,
          fullDescription: `${topic} helps ${audience} solve a practical need with a more structured, useful, and efficient experience.`,
          benefits: [
            'Clear positioning',
            'Practical value',
            'Fast to understand',
            'Ready to use in Telegram',
          ],
          cta: 'Open the offer and learn more.',
        };

      case 'ad-copy-pack':
        return {
          adCopies: [
            `${topic} for ${audience}. ${input.offer || 'Explore the offer today.'}`,
            `A clearer way for ${audience} to get results with ${topic}. ${input.offer || 'Try it now.'}`,
            `${topic} is built for action. ${input.offer || 'Take a look today.'}`,
            `If you need sharper results, start with ${topic}. ${input.offer || 'See how it works.'}`,
            `${topic} helps ${audience} move faster. ${input.offer || 'Get started now.'}`,
          ],
          hooks: [
            'Sharper message, faster action',
            'Built for practical results',
            'Clear value, less noise',
            'A better way to promote',
            'More clarity, more response',
            'A stronger hook for your audience',
            'Useful copy that converts',
            'Fast to launch, easy to use',
            'Built for Telegram promotion',
            'Stronger ad angles, instantly',
          ],
          ctas: ['Try it now', 'Open the offer', 'Get started'],
        };

      case 'brand-starter-pack':
        return {
          positioning: `${input.brandName || topic} is positioned as a focused solution for ${audience} in ${input.niche || 'its niche'}.`,
          valueProposition: `${input.brandName || topic} helps ${audience} get a clearer, faster, and more useful experience.`,
          slogans: [
            'Clear value, fast action',
            'Built to move faster',
            'Smart positioning starts here',
            'Clarity that converts',
            'Launch with confidence',
          ],
          toneOfVoice: 'Clear, confident, modern, commercially sharp.',
          brandBio: `${input.brandName || topic} is a focused brand built for ${audience}, combining clarity, speed, and useful outcomes.`,
        };

      default:
        return {
          result: `${order.serviceTitle} completed for ${topic}.`,
          bullets: [
            `Audience: ${audience}`,
            'Structured output delivered',
            'Ready to use in Telegram',
          ],
        };
    }
  }
}