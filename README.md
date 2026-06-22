# Office World Cup 2026 Sweepstake Tracker

A live-updating sweepstake table for the Pax8 Brisbane office, showing real-time standings,
fixtures, and scores from the FIFA World Cup 2026. Times are shown in AEST.

Live at: **https://world-cup-sweepstake-gamma-nine.vercel.app**

---

## Quick Start (local dev)

```bash
npm install
npm run dev
```

Open <http://localhost:5173> in your browser. The dev server proxies `/api/*` to a local
Express server (`server/index.mjs`) — no env vars or API keys needed.

---

## How It Works

| What | How often |
|------|-----------|
| Live scores & match status | Every 30 seconds |
| Group standings | Every 2 minutes |

Data is fetched from [worldcup26.ir](https://worldcup26.ir) — a free community API.
The serverless functions cache upstream responses (30s for games, 5 min for teams) and
retry up to 3 times on network failure to smooth over intermittent API blips.

**Live indicator** — a pulsing red dot appears when a participant's country is currently playing.

**Row flash** — rows glow yellow when their score or status changes.

**Staleness warning** — an amber banner appears if live data hasn't refreshed in over 90 seconds.

**Browser notifications** — click the `🔔 Notify me` button in the header to opt in to
desktop notifications when a sweepstake participant's country scores or a match finishes.
Click `🔔 On` / `🔕 Off` to toggle notifications on or off at any time (preference is saved).

**Confetti** — fires automatically when any participant's country wins the tournament.

---

## Editing Participants

The participant list lives in `src/config/sweepstake.ts` — maintained by Chris (Talent Acquisition):

```ts
export const SWEEPSTAKE = [
  { person: 'Chris', country: 'Argentina' },
  { person: 'Ray',   country: 'Brazil' },
  // one entry per participant, up to 48 teams
];
```

Edit the file and save — Vite hot-reloads instantly in dev. For the live site, commit and push;
Vercel deploys automatically within ~30 seconds.

If a team's stats show blank, it's likely a country name mismatch between the API and the config.
Add the API's spelling to `ALIAS_GROUPS` in `src/utils/helpers.ts`.

---

## Deployment (Vercel)

The repo auto-deploys via Vercel on every push to `main`.

- **Production:** https://world-cup-sweepstake-gamma-nine.vercel.app
- **Preview:** each branch gets its own preview URL

The `api/` directory contains the serverless functions (`api/matches.js`, `api/standings.js`).
Vercel routes `/api/*` to them automatically — no configuration needed.

To deploy a fresh instance:
1. Push to GitHub.
2. Import the repo in [vercel.com/new](https://vercel.com/new) — it auto-detects Vite.
   Build command: `npm run build`, output directory: `dist`.
3. Done — no env vars or API keys required.

---

## Country Name Matching

Country names from the API are normalised in `src/utils/helpers.ts` via `ALIAS_GROUPS`.
If a new team alias appears during the tournament (e.g. "United States" vs "USA"), add it
to the relevant group array — no changes needed anywhere else.
