# Lock In

Daily lock-in tracker (web + PWA). You generate today’s tasks from **main goals**, use **plays** as methods, tap **rules** (no alcohol, no social, …) separately, then lock the day. Friends and a leaderboard share one public streak: days locked in.

Skip is allowed. It stays visible.

## Stack

- **Next.js 16** (App Router) on Vercel
- **Convex** for data, auth, and task generation
- **Convex Auth** (username + password — username is the login id)
- **Groq** (`qwen/qwen3.6-27b`) for AI tasks
- **PWA** (install from Profile)

The old SQLite / Next API routes are gone. Everything live goes through Convex.

## Run locally

```bash
npm install
copy .env.example .env.local
```

Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local` to your Convex deployment URL, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up with a username (that handle never changes). Write goals on Profile, generate tasks, clear or skip them, lock in.

Do not commit `.env.local`.

## Environment

### Next / Vercel

| Variable | Where | What |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` and Vercel | Convex cloud URL. Vercel’s Convex build step can set this for you. |
| `CONVEX_DEPLOY_KEY` | Vercel only | Production (or preview) deploy key from the Convex dashboard. Used by `npx convex deploy` during the Vercel build. |

### Convex dashboard (not Vercel)

| Variable | What |
|---|---|
| `GROQ_API_KEY` | Groq key for generate. Without it, tasks fall back to a local list from goals/plays. |
| Convex Auth JWT keys | `JWT_PRIVATE_KEY` / `JWKS` from Convex Auth setup |
| `DEV_UNLIMITED_GENERATE` | Set `true` on **preview only**. Unlimited generate + Unlock. Leave unset in production (3 generates/day). |

`NODE_ENV` is built into Next. `next dev` shows Unlock. Production builds hide it.

## Deploy on Vercel

Repo root **is** this app (the Git remote points at this folder).

1. Import [donatasWebDev/Lock_In](https://github.com/donatasWebDev/Lock_In) in Vercel. Framework: Next.js (already in `vercel.json`).
2. Build command is already:

   ```
   npx convex deploy --cmd "npm run build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
   ```

3. In Vercel project env, add `CONVEX_DEPLOY_KEY` from Convex → production deploy key.
4. In the Convex dashboard, set `GROQ_API_KEY` on that production deployment.
5. First production deploy creates/updates Convex functions, then builds Next.

Local production check (does **not** push Convex):

```bash
npm run build
```

This repo’s `npm run build` completed successfully (Next 16.3, 13 static routes).

## Generate

- Goals lead. Plays are methods, spread across the list.
- Standing rules stay on Today as their own checkboxes — not generated tasks.
- Production: **3 generates per day**.
- Preview/dev with `DEV_UNLIMITED_GENERATE=true`: unlimited.

## PWA

Install from **Profile → Download app**, or the browser install prompt. Chrome / Edge on Android, or iPhone Share → Add to Home Screen.
