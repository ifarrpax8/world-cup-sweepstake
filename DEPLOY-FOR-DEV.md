# Deployment Brief — World Cup Sweepstake Tracker

**For:** the developer deploying this app
**From:** Chris (Talent Acquisition, Pax8 Brisbane)
**Goal:** Get this running on a public URL the whole office can open on their phones.

---

## TL;DR

It's a **Vite + React + TypeScript** front end with a small **Express proxy**
(`server/index.mjs`) that fetches live World Cup data from a public API
(`worldcup26.ir`) so the browser never hits CORS issues. It runs locally today
with `npm install && npm run dev`. It needs deploying so it's shareable.

**Recommended host: Vercel** (free, fastest path). Netlify works too.

There is **no API key** — the upstream data source is keyless, so there are no
secrets to configure. That simplifies deployment a lot.

---

## What needs to change for production

The only architectural wrinkle: the Express server (`server/index.mjs`) won't
run as-is on Vercel/Netlify — those platforms use **serverless functions**, not
a long-running Express process. The logic is trivial to port, though.

The server exposes three routes that the front end calls:

| Route | What it returns |
|-------|-----------------|
| `GET /api/matches`   | All matches, transformed to the app's shape |
| `GET /api/standings` | Group tables, calculated from match results |
| `GET /api/scorers`   | Returns `{ scorers: [] }` (data source has no scorers) |

Each just fetches from `https://worldcup26.ir/get/games` and `/get/teams`,
transforms the JSON, and returns it. All transform logic already exists in
`server/index.mjs` — copy it across verbatim.

### Option A — Vercel (recommended)

1. Create three files under `/api/`:
   - `api/matches.js`
   - `api/standings.js`
   - `api/scorers.js`
2. Move the relevant handler body from `server/index.mjs` into each, exported as
   a Vercel serverless function:
   ```js
   export default async function handler(req, res) {
     // ...the existing fetch + transform logic for this route...
     res.json(result);
   }
   ```
3. Vite's `vite.config.ts` proxy is dev-only and can stay — in production the
   `/api/*` paths resolve to the serverless functions automatically on the same
   domain, so **no CORS config and no env vars are needed**.
4. Push to a GitHub repo, import it in Vercel, accept the defaults
   (Vercel auto-detects Vite). Build command `npm run build`, output `dist`.
5. Done — you get a `*.vercel.app` URL.

### Option B — Netlify

Same idea, functions live in `netlify/functions/`. Add a `netlify.toml` with a
redirect from `/api/*` to `/.netlify/functions/:splat`. Build `npm run build`,
publish `dist`.

### Option C — Single-host (if you'd rather not split)

If you'd prefer to keep the Express server intact, deploy the whole thing to
**Render** or **Railway** as a Node web service that serves both the built
front end (`dist`) and the `/api` routes from one Express process. Slightly more
config, but zero code changes to the server. Your call.

---

## A few things worth knowing

- **Data source reliability:** `worldcup26.ir` is a free community API and has
  been intermittently flaky. If it 500s in production, the same transform logic
  also works against the GitHub raw JSON files at
  `https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/`
  (`football.matches.json`, `football.teams.json`) — a good fallback worth
  wiring in. Consider caching the upstream response for ~30s to be a good
  citizen and to smooth over blips.
- **Polling:** the front end polls `/api/matches` every 30s, standings every
  2 min, scorers every 5 min (see `src/hooks/useFootballData.ts`). Fine for a
  serverless setup; each poll is one function invocation.
- **Country name matching** is centralised in `src/utils/helpers.ts`
  (`matchesCountry` + `ALIAS_GROUPS`). If a team ever shows blank stats, it's an
  alias mismatch — add the API's spelling to the relevant group array. Don't
  re-add name remapping in the server; it's deliberately kept in one place.
- **Participant list** lives in `src/config/sweepstake.ts` — Chris maintains it.
- **Branding:** Pax8 palette + Inter font are already wired into
  `tailwind.config.js` and `index.css`. Header uses an animated brand gradient.

---

## What I (Chris) need back from you

1. The public URL once it's live.
2. A heads-up if you change anything about how the participant list is edited,
   so I know how to update people's picks during the tournament.

Thanks heaps! 🏆
