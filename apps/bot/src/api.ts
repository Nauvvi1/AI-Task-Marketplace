import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api`,
  timeout: 15000,
});

export async function upsertTelegramUser(payload: {
  telegramId: string;
  username?: string;
  firstName?: string;
  languageCode?: string;
}) {
  const { data } = await api.post('/users/telegram', payload);
  return data;
}

export async function listServices() {
  const { data } = await api.get('/catalog/services');
  return data;
}

export async function createOrder(payload: {
  telegramId: string;
  serviceCode: string;
  input?: Record<string, string>;
}) {
  const { data } = await api.post('/orders', payload);
  return data;
}

export async function updateOrderBrief(orderId: string, input: Record<string, string>) {
  const { data } = await api.patch(`/orders/${orderId}/brief`, { input });
  return data;
}

export async function createPaymentIntent(orderId: string) {
  const { data } = await api.post('/payments/intents', { orderId });
  return data;
}

export async function listOrders(
  telegramId: string,
  page = 1,
  limit = 5,
) {
  const { data } = await api.get('/orders', {
    params: { telegramId, page, limit },
  });
  return data;
}

export async function getOrder(orderId: string) {
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
}

export async function getUserProfile(telegramId: string) {
  const { data } = await api.get(`/users/${telegramId}`);
  return data;
}