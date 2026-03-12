import { SERVICE_CATALOG } from '@nauvvi/shared';

export function renderWelcome() {
  return [
    '🚀 <b>Nauvvi</b> — AI Creator Toolkit for Telegram',
    '',
    'Buy structured AI deliverables with Toncoin directly inside Telegram.',
    '',
    'Best for:',
    '• channel owners',
    '• sellers',
    '• creators',
    '• web3/product teams',
  ].join('\n');
}

export function renderServices() {
  return SERVICE_CATALOG.map(
    (service) =>
      `${service.emoji} <b>${service.title}</b>\n${service.shortDescription}\n💎 ${service.priceTon} TON · ⏱ ${service.etaSeconds}s`,
  ).join('\n\n');
}