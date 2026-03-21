# Demo Script

Target length: 1.5–2.5 minutes.

## Flow

1. Open the Telegram bot.
2. Show the command menu: `/start`, `/services`, `/orders`.
3. Run `/start`.
4. Open `Services`.
5. Briefly scroll the service list.
6. Choose one service, ideally `Telegram Launch Pack`.
7. Answer the short brief.
8. Show the order summary with price and `Pay in TON` button.
9. Open the Mini App.
10. Show connected wallet / payment screen.
11. Confirm payment.
12. Return to Telegram.
13. Open `My Orders`.
14. Open the created order.
15. Show `View Result`.
16. Open the result.
17. Show pagination in `My Orders`.

## Before recording

- Prepare `.env` with working ngrok URLs.
- Start Postgres and Redis.
- Start API, bot, and web.
- Make sure the wallet is already connected if you want a cleaner demo.
- Create a few extra orders in advance so pagination is visible.
- Keep one completed order ready.

## Good ending frame

End the video right after showing paginated `My Orders` or the completed result.
