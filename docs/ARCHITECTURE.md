# Architecture Notes

## Core principles
- Telegram-native UX first
- Structured AI outputs, not freeform chat
- TON payment drives order execution
- Polished catalog + history + status tracking

## Runtime components
- API: NestJS + Prisma + BullMQ
- Bot: grammY long polling
- Web: Vite React Mini App + TON Connect UI
- DB: PostgreSQL
- Queue/cache: Redis

## Order lifecycle
1. Draft
2. AwaitingPayment
3. PaymentPending
4. Paid
5. InProgress
6. Completed / Failed / Refunded / Canceled
