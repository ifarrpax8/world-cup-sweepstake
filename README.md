# Office World Cup 2026 Sweepstake Tracker

A live-updating sweepstake table for your office, showing real-time standings,
fixtures, and scores from the FIFA World Cup 2026. Times are shown in AEST.

---

## Quick Start

### 1. Get a free API key

1. Sign up at <https://www.football-data.org/client/register> (it's free).
2. Copy your API token from the account dashboard.

### 2. Set up your environment file

```bash
cp .env.example .env
```

Open `.env` and paste your key:

```
FOOTBALL_API_KEY=your_key_here
COMPETITION_CODE=WC2026
```

> **Note:** Verify the competition code by browsing to
> `https://api.football-data.org/v4/competitions` after signing in.
> Look for the 2026 FIFA World Cup entry and use its `code` value.

### 3. Add your sweepstake participants

Edit `src/config/sweepstake.ts` — it's a simple list at the top of the file:

```ts
export const SWEEPSTAKE = [
  { person: 'Chris', country: 'Argentina' },
  { person: 'Ray',   country: 'Brazil' },
  // Add one entry per participant, up to 48 teams
];
```

Country names must match the API. Run the app and check the browser console
for any "unmatched country" warnings.

### 4. Install and run

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

The free API tier allows 10 requests per minute — the polling intervals above
stay safely within that limit.

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

The Express proxy server needs to run somewhere server-side to protect your API key.

**Vercel (recommended):**
1. Move the contents of `server/index.mjs` into a Vercel Serverless Function
   under `api/` (e.g. `api/standings.js`, `api/matches.js`, `api/scorers.js`).
2. Set `FOOTBALL_API_KEY` and `COMPETITION_CODE` in your Vercel project's
   Environment Variables settings.
3. Push to GitHub and connect the repo in Vercel — it handles the rest.

**Netlify:**
Similar approach using Netlify Functions under `netlify/functions/`.

---

## Editing participants mid-tournament

Just edit `src/config/sweepstake.ts` and save — Vite hot-reloads instantly.
No restart required.
