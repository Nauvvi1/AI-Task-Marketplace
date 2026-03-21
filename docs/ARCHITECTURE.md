# Architecture

## Apps

### `apps/bot`
Telegram entry point built with grammY.

Handles:

- `/start`, `/services`, `/orders`
- service selection
- brief collection
- order list with pagination
- opening the Mini App for payment
- viewing completed results

### `apps/web`
Telegram Mini App built with React + Vite + TON Connect.

Handles:

- wallet connect
- wallet binding to Telegram user
- payment confirmation
- order/payment status polling
- standalone wallet screen when opened without payment context

### `apps/api`
NestJS backend.

Handles:

- catalog
- users
- orders
- payment intents
- payment confirmation
- AI generation queue
- Telegram delivery of completed results
- TON Connect manifest endpoint

## Main flow

```text
Telegram bot
→ choose service
→ answer brief
→ create order
→ create payment intent
→ open Mini App
→ connect wallet and confirm payment
→ backend confirms payment
→ generation job starts
→ result is sent back to Telegram
```

## Order statuses

- `Draft`
- `AwaitingPayment`
- `PaymentPending`
- `Paid`
- `InProgress`
- `Completed`
- `Failed`
- `Refunded`
- `Canceled`

## Payment flow

1. Bot creates an order.
2. Backend creates a payment intent with TON Connect payload.
3. Mini App opens with `orderId`, `paymentIntentId`, `telegramId`.
4. User connects wallet and confirms the transaction.
5. Frontend calls `/api/payments/confirm`.
6. Backend marks payment as confirmed.
7. Order moves to `Paid` and a BullMQ generation job is queued.

## AI generation

- Queue: BullMQ
- Worker: `AiProcessor`
- Result is stored in `order.outputJson`
- Completed result is also sent to Telegram via Bot API

If `OPENAI_API_KEY` is missing, the API uses mock generation so the full flow still works.

## Data layer

- PostgreSQL — orders, users, payment intents, generation jobs
- Redis — BullMQ connection
- Prisma — ORM and migrations

## Public URLs

This project expects two public URLs during local development:

- `WEB_URL` / `VITE_WEB_BASE_URL` → web tunnel
- `VITE_API_BASE_URL` → api tunnel

The TON Connect manifest is served by the API and points back to `WEB_URL`.
