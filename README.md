# AI Task Marketplace

Telegram bot + Telegram Mini App for buying AI content packs with TON.

## What it does

User flow:

1. Open the bot in Telegram.
2. Choose a service.
3. Fill a short brief.
4. Create an order.
5. Open the Mini App and confirm payment in TON.
6. Backend marks the payment, starts AI generation, and sends the result back to Telegram.

Included services:

- Telegram Launch Pack
- Telegram Post Pack
- Product Sales Pack
- Ad Copy Pack
- Translate & Localize
- Brand Starter Pack

## Project structure

- `apps/api` — NestJS API, Prisma, BullMQ, payment flow, AI generation
- `apps/bot` — grammY Telegram bot
- `apps/web` — Vite React Mini App with TON Connect
- `packages/shared` — shared catalog and types
- `prisma` — schema and migrations

## Requirements

- Node.js 20+
- npm
- Docker Desktop
- ngrok

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create env file

```bash
cp .env.example .env
```

Fill these values in `.env`:

- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_SUPPORT_URL`
- `TON_RECEIVER_ADDRESS`

## Local infrastructure

Start Postgres and Redis:

```bash
npm run docker:up
```

Redis is exposed on `6380`, so `REDIS_URL` should stay:

```env
REDIS_URL=redis://localhost:6380
```

## Database

Generate Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Optional demo seed:

```bash
npm run prisma:seed
```

## ngrok

This project uses **two tunnels**:

- `web` → `5173`
- `api` → `3001`

Example `ngrok.yml`:

```yaml
tunnels:
  web:
    proto: http
    addr: 5173

  api:
    proto: http
    addr: 3001
```

Start ngrok:

```bash
ngrok start --all
```

Then update `.env`:

- `WEB_URL` = **web** ngrok URL
- `VITE_WEB_BASE_URL` = **web** ngrok URL
- `VITE_API_BASE_URL` = **api** ngrok URL

Example:

```env
WEB_URL=https://your-web.ngrok-free.app
VITE_WEB_BASE_URL=https://your-web.ngrok-free.app
VITE_API_BASE_URL=https://your-api.ngrok-free.app
```

If ngrok URLs change, update `.env` and restart the apps.

## Run

You can run everything together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev -w @nauvvi/api
npm run dev -w @nauvvi/bot
npm run dev -w @nauvvi/web
```

Local ports:

- API: `http://localhost:3001`
- Web: `http://localhost:5173`

## What to verify after start

### API health

Open:

```text
http://localhost:3001/api/health
```

### TON Connect manifest

Open:

```text
https://YOUR_API_NGROK/api/tonconnect-manifest.json
```

### Web icon

Open:

```text
https://YOUR_WEB_NGROK/icon.png
```

## Telegram bot commands

The bot sets these commands on startup:

- `/start`
- `/services`
- `/orders`

## Payment modes

### Demo mode

```env
TON_PAYMENT_MODE=demo
VITE_TON_PAYMENT_MODE=demo
```

Use this for the fastest local end-to-end test.

### Onchain mode

```env
TON_PAYMENT_MODE=onchain
VITE_TON_PAYMENT_MODE=onchain
```

Use this when confirming through TON Connect.

## Main API routes

- `GET /api/health`
- `GET /api/catalog/services`
- `POST /api/orders`
- `GET /api/orders?telegramId=...&page=1&limit=5`
- `GET /api/orders/:id`
- `POST /api/payments/intents`
- `GET /api/payments/intents/:id`
- `POST /api/payments/confirm`
- `POST /api/users/telegram`
- `PATCH /api/users/:telegramId/wallet`
- `GET /api/users/:telegramId`

## Typical test flow

1. Start the bot with `/start`.
2. Open `Services`.
3. Pick a service and answer the brief questions.
4. Press `Pay in TON`.
5. Confirm payment in the Mini App.
6. Wait for the order to move to `Paid` → `InProgress` → `Completed`.
7. Open `My Orders` and view the result.
