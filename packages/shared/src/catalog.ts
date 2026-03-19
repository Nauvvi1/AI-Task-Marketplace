import { z } from 'zod';

export const OrderStatus = z.enum([
  'Draft',
  'AwaitingPayment',
  'PaymentPending',
  'Paid',
  'InProgress',
  'Completed',
  'Failed',
  'Refunded',
  'Canceled',
]);

export type OrderStatus = z.infer<typeof OrderStatus>;

export type ServiceDefinition = {
  code: string;
  title: string;
  shortDescription: string;
  description: string;
  priceTon: number;
  etaSeconds: number;
  emoji: string;
  hero?: boolean;
  briefFields: {
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    maxLength: number;
  }[];
  deliverables: string[];
};

export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    code: 'telegram-launch-pack',
    title: 'Telegram Launch Pack',
    shortDescription: 'Launch-ready content pack for channels and products.',
    description: 'Structured launch copy for Telegram creators, sellers, and product teams.',
    priceTon: 0.45,
    etaSeconds: 15,
    emoji: '🚀',
    hero: true,
    briefFields: [
      { key: 'topic', label: 'Topic', placeholder: 'What are you launching?', required: true, maxLength: 200 },
      { key: 'offer', label: 'Offer', placeholder: 'What is the key offer?', required: true, maxLength: 300 },
      { key: 'audience', label: 'Audience', placeholder: 'Who is this for?', required: true, maxLength: 200 },
      { key: 'tone', label: 'Tone', placeholder: 'Professional, bold, playful...', required: true, maxLength: 120 },
      { key: 'cta', label: 'CTA', placeholder: 'What should readers do?', required: true, maxLength: 120 },
    ],
    deliverables: ['3 launch posts', '5 headlines', '10 hooks', 'CTA block', '5 hashtags'],
  },
  {
    code: 'telegram-post-pack',
    title: 'Telegram Post Pack',
    shortDescription: 'A regular content pack for channel owners.',
    description: 'Fast content generation for ongoing Telegram posting.',
    priceTon: 0.35,
    etaSeconds: 10,
    emoji: '✍️',
    briefFields: [
      { key: 'topic', label: 'Topic', placeholder: 'What is the post about?', required: true, maxLength: 200 },
      { key: 'audience', label: 'Audience', placeholder: 'Who will read this?', required: true, maxLength: 200 },
      { key: 'tone', label: 'Tone', placeholder: 'Direct, expert, casual...', required: true, maxLength: 120 },
    ],
    deliverables: ['3 post variants', '5 headlines', '5 hooks'],
  },
  {
    code: 'product-sales-pack',
    title: 'Product Sales Pack',
    shortDescription: 'Structured selling copy for products and offers.',
    description: 'Useful for sellers, mini-shops, and product pages inside Telegram.',
    priceTon: 0.4,
    etaSeconds: 15,
    emoji: '🛍️',
    briefFields: [
      { key: 'productName', label: 'Product name', placeholder: 'Name of the product', required: true, maxLength: 200 },
      { key: 'features', label: 'Features', placeholder: 'Key features or benefits', required: true, maxLength: 400 },
      { key: 'audience', label: 'Audience', placeholder: 'Who buys this?', required: true, maxLength: 200 },
    ],
    deliverables: ['Short description', 'Full description', 'Benefits', 'CTA'],
  },
  {
    code: 'ad-copy-pack',
    title: 'Ad Copy Pack',
    shortDescription: 'Ad-ready copy with hooks and CTA.',
    description: 'A compact ad pack for Telegram promotions and acquisition campaigns.',
    priceTon: 0.35,
    etaSeconds: 10,
    emoji: '📣',
    briefFields: [
      { key: 'product', label: 'Product', placeholder: 'What are you promoting?', required: true, maxLength: 220 },
      { key: 'offer', label: 'Offer', placeholder: 'Discount, launch, CTA, etc.', required: true, maxLength: 220 },
      { key: 'audience', label: 'Audience', placeholder: 'Who is the target?', required: true, maxLength: 200 },
    ],
    deliverables: ['5 ad copies', '10 hooks', '3 CTA'],
  },
  {
    code: 'translate-localize',
    title: 'Translate & Localize',
    shortDescription: 'Translate and adapt text for a target audience.',
    description: 'Fast localization workflow for creators and product teams.',
    priceTon: 0.25,
    etaSeconds: 10,
    emoji: '🌍',
    briefFields: [
      { key: 'sourceText', label: 'Source text', placeholder: 'Paste the text here', required: true, maxLength: 2500 },
      { key: 'targetLanguage', label: 'Target language', placeholder: 'e.g. Spanish', required: true, maxLength: 80 },
      { key: 'tone', label: 'Tone', placeholder: 'Formal, casual, premium...', required: false, maxLength: 80 },
    ],
    deliverables: ['Direct translation', 'Localized version', 'Alternative version'],
  },
  {
    code: 'brand-starter-pack',
    title: 'Brand Starter Pack',
    shortDescription: 'Fast brand positioning and messaging starter.',
    description: 'Useful for launches, new products, and channel positioning.',
    priceTon: 0.6,
    etaSeconds: 25,
    emoji: '🧠',
    briefFields: [
      { key: 'brandName', label: 'Brand name', placeholder: 'Name of the brand/project', required: true, maxLength: 140 },
      { key: 'niche', label: 'Niche', placeholder: 'What market are you in?', required: true, maxLength: 200 },
      { key: 'audience', label: 'Audience', placeholder: 'Who is the audience?', required: true, maxLength: 200 },
    ],
    deliverables: ['Positioning', 'Value proposition', '5 slogans', 'Tone of voice', 'Brand bio'],
  },
];

export const serviceByCode = (code: string) => SERVICE_CATALOG.find((service) => service.code === code);
