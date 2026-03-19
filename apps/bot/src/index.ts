import path from 'node:path';
import dotenv from 'dotenv';
import { Bot, InlineKeyboard } from 'grammy';

dotenv.config({
  path: path.resolve(process.cwd(), '../../.env'),
});

import { serviceByCode, SERVICE_CATALOG } from '@nauvvi/shared';
import {
  createOrder,
  createPaymentIntent,
  getOrder,
  getUserProfile,
  listOrders,
  upsertTelegramUser,
} from './api';
import { getSession, resetSession } from './session';
import { renderServices, renderWelcome } from './render';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

const ORDERS_PER_PAGE = 5;

bot.catch((err) => {
  console.error('Bot error:', err);
});

function getWebAppBaseUrl() {
  return process.env.WEB_URL || 'http://localhost:5173';
}

function mainMenu() {
  const webAppUrl = getWebAppBaseUrl();

  return new InlineKeyboard()
    .text('Services', 'menu:services')
    .text('My Orders', 'menu:orders')
    .row()
    .webApp('Wallet / Pay', webAppUrl)
    .url('Support', process.env.TELEGRAM_SUPPORT_URL || 'https://t.me');
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function buildOrdersKeyboard(
  orders: any[],
  page: number,
  totalPages: number,
) {
  const keyboard = new InlineKeyboard();

  orders.forEach((order: any) => {
    keyboard.text(order.publicOrderNo, `order:${order.id}`).row();
  });

  keyboard.text('🛍 Services', 'menu:services').row();

  if (totalPages > 1) {
    if (page > 1) {
      keyboard.text('⬅ Prev', `orders:page:${page - 1}`);
    }
    if (page < totalPages) {
      keyboard.text('Next ➡', `orders:page:${page + 1}`);
    }
    keyboard.row();
  }

  keyboard.text('⬅ Main menu', 'menu:main');

  return keyboard;
}

async function sendMainMenu(ctx: any) {
  await ctx.reply(renderWelcome(), {
    parse_mode: 'HTML',
    reply_markup: mainMenu(),
  });
}

async function sendServicesMessage(ctx: any) {
  const keyboard = new InlineKeyboard();

  for (const service of SERVICE_CATALOG) {
    keyboard.text(`${service.emoji} ${service.title}`, `service:${service.code}`).row();
  }

  keyboard.text('⬅ Main menu', 'menu:main');

  await ctx.reply(renderServices(), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

async function sendOrdersMessage(ctx: any, page = 1, edit = false) {
  const telegramId = String(ctx.from.id);
  const result = await listOrders(telegramId, page, ORDERS_PER_PAGE);

  const orders = Array.isArray(result) ? result : result.items || [];
  const total = Array.isArray(result) ? result.length : result.total || 0;
  const totalPages = Array.isArray(result)
    ? Math.max(1, Math.ceil(result.length / ORDERS_PER_PAGE))
    : Math.max(1, result.totalPages || Math.ceil(total / ORDERS_PER_PAGE) || 1);

  const text = orders.length
    ? `Your recent orders: (page ${page}/${totalPages})`
    : 'No orders yet. Open Services and create your first order.';

  const keyboard = orders.length
    ? buildOrdersKeyboard(orders, page, totalPages)
    : new InlineKeyboard()
        .text('🛍 Services', 'menu:services')
        .row()
        .text('⬅ Main menu', 'menu:main');

  if (edit) {
    try {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
      });
      return;
    } catch (error: any) {
      const message = String(error?.message || '');
      if (!message.includes('message is not modified')) {
        throw error;
      }
      return;
    }
  }

  await ctx.reply(text, {
    reply_markup: keyboard,
  });
}

function renderResult(order: any) {
  const out = order.outputJson || {};
  const serviceCode = order.service?.code;

  if (serviceCode === 'telegram-launch-pack') {
    const titles = Array.isArray(out.titles) ? out.titles.map((t: string) => `• ${escapeHtml(t)}`).join('\n') : '—';
    const posts = Array.isArray(out.posts)
      ? out.posts.map((p: string, i: number) => `${i + 1}. ${escapeHtml(p)}`).join('\n\n')
      : '—';
    const hooks = Array.isArray(out.hooks) ? out.hooks.map((h: string) => `• ${escapeHtml(h)}`).join('\n') : '—';
    const hashtags = Array.isArray(out.hashtags) ? out.hashtags.map((h: string) => escapeHtml(h)).join(' ') : '—';
    const cta = out.cta ? escapeHtml(out.cta) : '—';

    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
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
      `🎯 <b>CTA</b>\n${cta}`,
      '',
      `# <b>Hashtags</b>\n${hashtags}`,
    ].join('\n');
  }

  if (serviceCode === 'telegram-post-pack') {
    const titles = Array.isArray(out.titles) ? out.titles.map((t: string) => `• ${escapeHtml(t)}`).join('\n') : '—';
    const posts = Array.isArray(out.posts)
      ? out.posts.map((p: string, i: number) => `${i + 1}. ${escapeHtml(p)}`).join('\n\n')
      : '—';
    const hooks = Array.isArray(out.hooks) ? out.hooks.map((h: string) => `• ${escapeHtml(h)}`).join('\n') : '—';

    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
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

  if (serviceCode === 'product-sales-pack') {
    const benefits = Array.isArray(out.benefits)
      ? out.benefits.map((b: string) => `• ${escapeHtml(b)}`).join('\n')
      : '—';

    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
      '',
      `🧩 <b>Short Description</b>\n${escapeHtml(out.shortDescription || '—')}`,
      '',
      `📄 <b>Full Description</b>\n${escapeHtml(out.fullDescription || '—')}`,
      '',
      `✅ <b>Benefits</b>\n${benefits}`,
      '',
      `🎯 <b>CTA</b>\n${escapeHtml(out.cta || '—')}`,
    ].join('\n');
  }

  if (serviceCode === 'ad-copy-pack') {
    const adCopies = Array.isArray(out.adCopies)
      ? out.adCopies.map((a: string, i: number) => `${i + 1}. ${escapeHtml(a)}`).join('\n\n')
      : '—';
    const hooks = Array.isArray(out.hooks)
      ? out.hooks.map((h: string) => `• ${escapeHtml(h)}`).join('\n')
      : '—';
    const ctas = Array.isArray(out.ctas)
      ? out.ctas.map((c: string) => `• ${escapeHtml(c)}`).join('\n')
      : '—';

    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
      '',
      '📣 <b>Ad Copies</b>',
      adCopies,
      '',
      '⚡ <b>Hooks</b>',
      hooks,
      '',
      '🎯 <b>CTAs</b>',
      ctas,
    ].join('\n');
  }

  if (serviceCode === 'translate-localize') {
    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
      '',
      `🌍 <b>Translation</b>\n${escapeHtml(out.translation || '—')}`,
      '',
      `🪄 <b>Localized Version</b>\n${escapeHtml(out.localizedVersion || '—')}`,
      '',
      `✨ <b>Alternative Version</b>\n${escapeHtml(out.alternativeVersion || '—')}`,
    ].join('\n');
  }

  if (serviceCode === 'brand-starter-pack') {
    const slogans = Array.isArray(out.slogans)
      ? out.slogans.map((s: string) => `• ${escapeHtml(s)}`).join('\n')
      : '—';

    return [
      `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
      `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
      '',
      `🧭 <b>Positioning</b>\n${escapeHtml(out.positioning || '—')}`,
      '',
      `💎 <b>Value Proposition</b>\n${escapeHtml(out.valueProposition || '—')}`,
      '',
      `🪧 <b>Slogans</b>\n${slogans}`,
      '',
      `🎙 <b>Tone of Voice</b>\n${escapeHtml(out.toneOfVoice || '—')}`,
      '',
      `📘 <b>Brand Bio</b>\n${escapeHtml(out.brandBio || '—')}`,
    ].join('\n');
  }

  const bullets = Array.isArray(out.bullets)
    ? out.bullets.map((b: string) => `• ${escapeHtml(b)}`).join('\n')
    : '';

  return [
    `✅ <b>${escapeHtml(order.service.title)} is ready</b>`,
    `Order: <b>${escapeHtml(order.publicOrderNo)}</b>`,
    '',
    escapeHtml(out.result || 'Your result is ready.'),
    '',
    bullets,
  ].join('\n');
}

bot.command('start', async (ctx) => {
  try {
    await upsertTelegramUser({
      telegramId: String(ctx.from.id),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      languageCode: ctx.from.language_code,
    });
  } catch (error) {
    console.error('Failed to upsert Telegram user:', error);
    await ctx.reply(
      'Backend is still starting. Please wait a few seconds and send /start again.',
    );
    return;
  }

  resetSession(String(ctx.chat.id));
  await sendMainMenu(ctx);
});

bot.command('services', async (ctx) => {
  await sendServicesMessage(ctx);
});

bot.command('orders', async (ctx) => {
  await sendOrdersMessage(ctx, 1);
});

bot.command('balance', async (ctx) => {
  try {
    const profile = await getUserProfile(String(ctx.from.id));

    if (!profile?.walletAddress) {
      await ctx.reply(
        'No wallet connected yet. Open Wallet / Pay and connect your TON wallet.',
        {
          reply_markup: new InlineKeyboard()
            .webApp('Wallet / Pay', getWebAppBaseUrl())
            .row()
            .text('⬅ Main menu', 'menu:main'),
        },
      );
      return;
    }

    await ctx.reply(
      `💼 <b>Your wallet</b>\n<code>${escapeHtml(profile.walletAddress)}</code>\n\nBalance command is enabled. On-chain balance lookup can be added next.`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('⬅ Main menu', 'menu:main'),
      },
    );
  } catch (error) {
    console.error('Failed to load balance:', error);
    await ctx.reply('Failed to load wallet info.', {
      reply_markup: new InlineKeyboard().text('⬅ Main menu', 'menu:main'),
    });
  }
});

bot.callbackQuery('menu:services', async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendServicesMessage(ctx);
});

bot.callbackQuery('menu:orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendOrdersMessage(ctx, 1);
});

bot.callbackQuery('menu:main', async (ctx) => {
  await ctx.answerCallbackQuery();
  resetSession(String(ctx.chat!.id));
  await sendMainMenu(ctx);
});

bot.callbackQuery(/orders:page:(\d+)/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const page = Number(ctx.match[1] || '1');
  await sendOrdersMessage(ctx, page, true);
});

bot.callbackQuery(/service:(.+)/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const code = ctx.match[1];
  const service = serviceByCode(code);
  if (!service) {
    await ctx.reply('Service not found.');
    return;
  }

  const chatId = String(ctx.chat!.id);
  const session = getSession(chatId);
  session.serviceCode = code;
  session.brief = {};
  session.currentStep = 0;

  const keyboard = new InlineKeyboard().text('⬅ Main menu', 'menu:main');

  await ctx.reply(
    `${service.emoji} <b>${service.title}</b>\n` +
      `${service.description}\n\n` +
      `💎 ${service.priceTon} TON · ⏱ ${service.etaSeconds}s\n\n` +
      `First question:\n` +
      `<b>${service.briefFields[0].label}</b>\n` +
      `${service.briefFields[0].placeholder}`,
    {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    },
  );
});

bot.callbackQuery(/order:(.+)/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const order = await getOrder(ctx.match[1]);

  let replyMarkup: InlineKeyboard | undefined;

  if (order.status === 'AwaitingPayment' || order.status === 'PaymentPending') {
    const existingIntent =
      order.paymentIntents?.find((intent: any) => intent.status !== 'Confirmed') || null;

    const paymentIntent = existingIntent || (await createPaymentIntent(order.id));

    const payUrl =
      `${getWebAppBaseUrl()}` +
      `?orderId=${order.id}&paymentIntentId=${paymentIntent.id}&telegramId=${ctx.from.id}`;

    replyMarkup = new InlineKeyboard()
      .webApp('Pay in TON', payUrl)
      .row()
      .text('My Orders', 'menu:orders')
  } else if (order.status === 'Completed') {
    replyMarkup = new InlineKeyboard()
      .text('View Result', `result:${order.id}`)
      .row()
      .text('My Orders', 'menu:orders')
  } else {
    replyMarkup = new InlineKeyboard()
      .text('My Orders', 'menu:orders')
  }

  await ctx.reply(
    `<b>${order.service.title}</b>\n` +
      `Order: ${order.publicOrderNo}\n` +
      `Status: ${order.status}\n` +
      `Price: ${order.priceTon} TON`,
    {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    },
  );
});

bot.callbackQuery(/result:(.+)/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const order = await getOrder(ctx.match[1]);

  if (order.status !== 'Completed' || !order.outputJson) {
    await ctx.reply('Result is not ready yet.');
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('My Orders', 'menu:orders')
    .text('⬅ Main menu', 'menu:main');

  await ctx.reply(renderResult(order), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
});

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const chatId = String(ctx.chat.id);
  const session = getSession(chatId);
  if (!session.serviceCode) return;

  const service = serviceByCode(session.serviceCode);
  if (!service) return;

  const step = session.currentStep ?? 0;
  const field = service.briefFields[step];
  if (!field) return;

  session.brief = session.brief || {};
  session.brief[field.key] = ctx.message.text.trim();

  const nextStep = step + 1;
  if (nextStep < service.briefFields.length) {
    session.currentStep = nextStep;
    const nextField = service.briefFields[nextStep];
    await ctx.reply(`<b>${nextField.label}</b>\n${nextField.placeholder}`, {
      parse_mode: 'HTML',
    });
    return;
  }

  const order = await createOrder({
    telegramId: String(ctx.from.id),
    serviceCode: service.code,
    input: session.brief,
  });

  session.orderId = order.id;
  const paymentIntent = await createPaymentIntent(order.id);
  const payUrl =
    `${getWebAppBaseUrl()}` +
    `?orderId=${order.id}&paymentIntentId=${paymentIntent.id}&telegramId=${ctx.from.id}`;

  const summary = [
    `✅ <b>${service.title}</b>`,
    '',
    'Deliverables:',
    ...service.deliverables.map((d) => `• ${d}`),
    '',
    `💎 Price: <b>${service.priceTon} TON</b>`,
    `⏱ ETA: <b>${service.etaSeconds}s</b>`,
    '',
    'Your order is ready for payment.',
  ].join('\n');

  const keyboard = new InlineKeyboard()
    .webApp('Pay in TON', payUrl)
    .row()
    .text('My Orders', 'menu:orders')
    .text('⬅ Main menu', 'menu:main');

  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  resetSession(chatId);
});

async function bootstrap() {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Open main menu' },
    { command: 'orders', description: 'Show recent orders' },
    { command: 'services', description: 'Browse available services' },
  ]);

  await bot.start();
  console.log('Nauvvi bot started');
}

bootstrap().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});