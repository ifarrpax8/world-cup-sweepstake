# Office World Cup 2026 Sweepstake Tracker

A live-updating sweepstake table for your office, showing real-time standings,
fixtures, and scores from the FIFA World Cup 2026. Times are shown in AEST.

---

## Quick Start

### 1. Add your sweepstake participants

Edit `src/config/sweepstake.ts` — it's a simple list at the top of the file:

```ts
export const SWEEPSTAKE = [
  { person: 'Chris', country: 'Argentina' },
  { person: 'Ray',   country: 'Brazil' },
  // Add one entry per participant, up to 48 teams
];
```

Country names must match the API.

### 2. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

---

## How It Works

| What | How often |
|------|-----------|
| Live scores & match status | Every 30 seconds |
| Group standings | Every 2 minutes |
| Top scorers | Every 5 minutes |

**Live indicator** — a pulsing red dot appears next to any country currently
playing. The score updates automatically.

**Row flash** — rows glow yellow when their data changes.

**Browser notifications** — click "Allow" when prompted to receive a desktop
notification when a sweepstake participant's country scores or a match finishes.

**Confetti** — fires automatically when any participant's country wins the tournament.

---

## Swapping the API provider

To use a different football data source:

1. Open `server/index.mjs`.
2. Change `API_BASE` to the new provider's base URL.
3. Update the three `proxyGet(...)` calls to match the new endpoint paths.
4. Update the `API_HEADERS` object with the new auth header format.

---

## Deploying to Vercel or Netlify

The `api/` directory already contains the Vercel serverless functions. To deploy:

**Vercel (recommended):**
1. Push to GitHub.
2. Import the repo in Vercel — it auto-detects Vite. Build command: `npm run build`, output directory: `dist`.
3. Done — you get a `*.vercel.app` URL with `/api/*` routes handled automatically.

**Netlify:**
Use Netlify Functions under `netlify/functions/` and add a `netlify.toml` redirect
from `/api/*` to `/.netlify/functions/:splat`.

---

## Editing participants mid-tournament

Just edit `src/config/sweepstake.ts` and save — Vite hot-reloads instantly.
No restart required.
