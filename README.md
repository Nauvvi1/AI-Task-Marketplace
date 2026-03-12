# Nauvvi — Telegram-native AI Creator Toolkit on TON

Nauvvi is a hackathon-ready monorepo for a **Telegram-native AI service marketplace** where creators, sellers, and channel owners buy structured AI deliverables with **Toncoin** and receive results directly inside Telegram.

The product is intentionally designed around the TON AI Agent Hackathon framing:

- **Telegram** is the interaction layer.
- **AI** is the execution engine.
- **TON** is the payments and trust layer.

## What is included

- **apps/api** — NestJS backend with catalog, orders, payment intents, AI generation pipeline, BullMQ jobs, Prisma, admin endpoints.
- **apps/bot** — grammY Telegram bot with service catalog, order wizard, order history, and payment handoff.
- **apps/web** — React Telegram Mini App with TON Connect payment confirmation UX.
- **packages/shared** — shared types, schemas, and service catalog metadata.
- **prisma/** — Prisma schema for PostgreSQL.
- **scripts/seed.ts** — demo catalog/user seed script.
- **docs/** — submission notes, architecture notes, and demo plan.

## Product scope

### Hero use case
A Telegram creator opens the bot, chooses **Telegram Launch Pack**, fills in a brief, pays in TON, and receives:
- 3 launch posts
- 5 headlines
- 10 hooks
- CTA block
- hashtags

### MVP services
- Telegram Launch Pack
- Telegram Post Pack
- Product Sales Pack
- Ad Copy Pack
- Translate & Localize
- Brand Starter Pack

## Architecture

```text
Telegram User
→ Telegram Bot (grammY)
→ API (NestJS)
→ Order Service
→ Payment Service
→ AI Service
→ BullMQ Queue / Workers
→ PostgreSQL / Redis
→ Result delivery back into Telegram
```

Mini App payment flow:

```text
Telegram Bot
→ Open Mini App with order + payment intent
→ Connect wallet with TON Connect
→ Confirm transaction
→ Backend verifies/records payment
→ Order moves to Paid → In Progress → Completed
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Copy env file

```bash
cp .env.example .env
```

Fill in:
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY` (optional for mock mode)
- `TON_RECEIVER_ADDRESS`
- `TON_MANIFEST_URL`

### 3. Start infra

```bash
docker compose up -d
```

### 4. Generate Prisma client and migrate DB

```bash
npm run prisma:generate
npm run prisma:migrate
npm run build:shared
npm run prisma:seed
```

### 5. Start all apps

```bash
npm run dev
```

Apps:
- API: http://localhost:3001
- Mini App: http://localhost:5173
- Bot: long polling in local process

TON Connect mobile wallet testing

TON Connect manifest must be publicly accessible over HTTPS at:

https://<YOUR_APP_URL>/tonconnect-manifest.json

For local desktop development, the Mini App can run on localhost.
For mobile wallet testing with Tonkeeper, expose the Mini App through a public HTTPS tunnel such as ngrok or cloudflared, then set:

TON_MANIFEST_URL=https://your-public-url/tonconnect-manifest.json
TON_CONNECT_RETURN_URL=https://t.me/your_bot
TON_PAYMENT_SUCCESS_REDIRECT_URL=https://t.me/your_bot

TON Docs require the manifest to be publicly reachable by direct GET request, and note that local testing may use a public demo manifest if needed.

## Real vs demo payment mode

This repository includes a **working payment intent flow** and TON Connect handoff UX. For hackathon demo speed, payment confirmation supports two modes:

1. **Demo mode** — use the built-in admin/demo confirmation endpoint to mark the intent as paid after the wallet handoff. Fastest for local judging demos.
2. **Real verification mode** — plug a TON indexer/provider into `TonVerificationService` to verify transactions against on-chain data tied to the expected recipient, amount, and order comment.

This design keeps the MVP practical while leaving a clean path to fully live verification.

## AI generation mode

If `OPENAI_API_KEY` is not set, the API falls back to **demo content generation** with structured mock output, so the end-to-end flow still works during setup.

## Why this project fits the hackathon

- **Track 2**: user-facing AI agent inside Telegram.
- **Meaningful TON integration**: TON payment is tied directly to order lifecycle.
- **Practical use case**: creators and sellers buy structured AI work products.
- **Working MVP architecture**: bot, backend, queue, wallet handoff, result delivery, order history.

## Demo checklist

- Start bot
- `/start`
- Services → Telegram Launch Pack
- Fill brief
- Open Mini App payment screen
- Connect wallet / confirm payment
- Watch order status change
- Receive completed result in Telegram
- Open My Orders and review history

## Notes

- `@ton/mcp` is intentionally left as a **future extension** instead of core MVP plumbing.
- TON Connect is the primary wallet/auth/payment surface for this build.
- This repo is built for **npm workspaces**, not pnpm.

## Submission assets

See `docs/` for:
- demo script
- architecture notes
- positioning notes
- future roadmap
