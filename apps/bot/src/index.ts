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
  listOrders,
  upsertTelegramUser,
} from './api';
import { getSession, resetSession } from './session';
import { renderServices, renderWelcome } from './render';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

function mainMenu() {
  const webAppUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';

  return new InlineKeyboard()
    .text('Services', 'menu:services')
    .text('My Orders', 'menu:orders')
    .row()
    .webApp('Wallet / Pay', webAppUrl)
    .url('Support', process.env.TELEGRAM_SUPPORT_URL || 'https://t.me');
}

bot.command('start', async (ctx) => {
  await upsertTelegramUser({
    telegramId: String(ctx.from.id),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    languageCode: ctx.from.language_code,
  });

  resetSession(String(ctx.chat.id));
  await ctx.reply(renderWelcome(), {
    parse_mode: 'HTML',
    reply_markup: mainMenu(),
  });
});

bot.command('services', async (ctx) => {
  const keyboard = new InlineKeyboard();
  for (const service of SERVICE_CATALOG) {
    keyboard.text(`${service.emoji} ${service.title}`, `service:${service.code}`).row();
  }

  await ctx.reply(renderServices(), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
});

bot.command('orders', async (ctx) => {
  const orders = await listOrders(String(ctx.from.id));

  if (!orders.length) {
    await ctx.reply('No orders yet. Open Services and create your first order.');
    return;
  }

  const lines = orders
    .slice(0, 10)
    .map((order: any) => `#${order.publicOrderNo} · ${order.service.title} · ${order.status}`);

  await ctx.reply(lines.join('\n'));
});

bot.callbackQuery('menu:services', async (ctx) => {
  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard();
  for (const service of SERVICE_CATALOG) {
    keyboard.text(`${service.emoji} ${service.title}`, `service:${service.code}`).row();
  }

  await ctx.reply(renderServices(), {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
});

bot.callbackQuery('menu:orders', async (ctx) => {
  await ctx.answerCallbackQuery();

  const orders = await listOrders(String(ctx.from.id));
  if (!orders.length) {
    await ctx.reply('No orders yet.');
    return;
  }

  const keyboard = new InlineKeyboard();
  orders
    .slice(0, 10)
    .forEach((order: any) => keyboard.text(order.publicOrderNo, `order:${order.id}`).row());

  await ctx.reply('Your recent orders:', { reply_markup: keyboard });
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

  await ctx.reply(
    `${service.emoji} <b>${service.title}</b>\n` +
      `${service.description}\n\n` +
      `💎 ${service.priceTon} TON · ⏱ ${service.etaSeconds}s\n\n` +
      `First question:\n` +
      `<b>${service.briefFields[0].label}</b>\n` +
      `${service.briefFields[0].placeholder}`,
    { parse_mode: 'HTML' },
  );
});

bot.callbackQuery(/order:(.+)/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const order = await getOrder(ctx.match[1]);
  await ctx.reply(
    `<b>${order.service.title}</b>\n` +
      `Order: ${order.publicOrderNo}\n` +
      `Status: ${order.status}\n` +
      `Price: ${order.priceTon} TON`,
    { parse_mode: 'HTML' },
  );
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
    `${process.env.WEB_BASE_URL || 'http://localhost:5173'}` +
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
  .text('My Orders', 'menu:orders');

  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  resetSession(chatId);
});

bot.start();
console.log('Nauvvi bot started');