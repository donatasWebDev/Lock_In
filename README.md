# Lock In

A focused lock-in tracker (web + PWA). You and friends track locked-in days, write personal strategies, get AI tasks from those strategies, and compete on a leaderboard. Skipping is allowed, and it stays visible.

Visuals follow the Magic Patterns mock in `../mock react` — dark theme, green accent, mobile-first.

## Run it

```bash
cd "C:\Users\Pcc\Desktop\code\Lock in\app"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, turn on strategies, generate today's tasks, then lock in.

## AI tasks

Task generation uses SpaceXAI (`grok-4.6` via `https://api.x.ai/v1`) when `XAI_API_KEY` is set in `.env.local`. Without a key, the app still generates a list from your active strategies so a day is never blocked.

Get a key at [console.x.ai](https://console.x.ai).

## PWA

Chrome / Edge: install from the address bar, or **Add to Home Screen** on a phone. The app is standalone, with a dark status bar and offline shell.

## Data

SQLite file lives in `data/lockin.db` on the machine that runs the server. Friends and the leaderboard are real multi-user — everyone has to hit the same running app.

Auth is email + password, stored as an httpOnly cookie.
