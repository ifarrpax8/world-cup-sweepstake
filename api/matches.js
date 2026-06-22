const API = 'https://worldcup26.ir';

function createCache(ttlMs) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() - entry.ts > ttlMs) { store.delete(key); return null; }
      return entry.val;
    },
    set(key, val) { store.set(key, { val, ts: Date.now() }); },
  };
}

const gamesCache = createCache(30_000);   // 30s — matches poll interval

async function getGames() {
  const cached = gamesCache.get('games');
  if (cached) return cached;
  const data = await fetchJSON(`${API}/get/games`);
  gamesCache.set('games', data);
  return data;
}

const NAME_MAP = {
  'United States':                     'USA',
  "Côte d'Ivoire":                     'Ivory Coast',
  'Czech Republic':                    'Czechia',
  'Korea Republic':                    'South Korea',
  'IR Iran':                           'Iran',
  'Bosnia and Herzegovina':            'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':                'Bosnia & Herzegovina',
  'Bosnia-Hercegovina':                'Bosnia & Herzegovina',
  'Congo DR':                          'DR Congo',
  'Democratic Republic of Congo':      'DR Congo',
  'Democratic Republic of the Congo':  'DR Congo',
  'D.R. Congo':                        'DR Congo',
  'Dem. Rep. Congo':                   'DR Congo',
};

function norm(name) {
  if (!name) return 'Unknown';
  // Exact map lookup first
  if (NAME_MAP[name]) return NAME_MAP[name];
  const lower = name.toLowerCase();
  // Catch any Congo variant that refers to the DR (not Republic of Congo)
  if (lower.includes('congo') && (lower.includes('dr') || lower.includes('dem') || lower.includes(' cd') || lower.startsWith('cd '))) {
    return 'DR Congo';
  }
  // Catch any Bosnia variant
  if (lower.includes('bosnia')) return 'Bosnia & Herzegovina';
  return name;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

function mapStatus(t, finished) {
  const fin = finished === 'TRUE' || finished === true || finished === 1;
  if (fin) return 'FINISHED';
  const s = (t ?? '').toLowerCase();
  if (s === '1h' || s === '2h' || s === 'live') return 'IN_PLAY';
  if (s === 'ht' || s === 'halftime') return 'PAUSED';
  return 'SCHEDULED';
}

function mapStage(type) {
  const map = { group:'GROUP_STAGE', r32:'LAST_32', r16:'ROUND_OF_16', qf:'QUARTER_FINALS', sf:'SEMI_FINALS', third:'THIRD_PLACE', final:'FINAL' };
  return map[(type??'').toLowerCase()] ?? 'GROUP_STAGE';
}

function parseDate(d) {
  if (!d) return new Date().toISOString();
  try {
    const [dp, tp='00:00'] = d.split(' ');
    const [mo,dy,yr] = dp.split('/');
    const [h,m] = tp.split(':');
    return new Date(Date.UTC(+yr,+mo-1,+dy,+h,+m)).toISOString();
  } catch { return new Date().toISOString(); }
}

function transformGame(g) {
  const hs=parseInt(g.home_score)||0, as_=parseInt(g.away_score)||0;
  const fin = g.finished==='TRUE'||g.finished===true||g.finished===1;
  return {
    id: parseInt(g.id),
    status: mapStatus(g.time_elapsed, g.finished),
    stage:  mapStage(g.type),
    group:  g.type==='group' ? `GROUP_${g.group}` : null,
    homeTeam: { id:parseInt(g.home_team_id)||0, name:norm(g.home_team_name_en||g.home_team_label||'TBD'), shortName:norm(g.home_team_name_en||'TBD'), tla:'', crest:'' },
    awayTeam: { id:parseInt(g.away_team_id)||0, name:norm(g.away_team_name_en||g.away_team_label||'TBD'), shortName:norm(g.away_team_name_en||'TBD'), tla:'', crest:'' },
    score: {
      winner: fin?(hs>as_?'HOME_TEAM':as_>hs?'AWAY_TEAM':'DRAW'):null,
      duration:'REGULAR',
      fullTime:{ home:fin?hs:null, away:fin?as_:null },
      halfTime:{ home:null, away:null },
      regularTime:null, extraTime:null, penalties:null,
    },
    utcDate: parseDate(g.local_date),
    matchday: parseInt(g.matchday)||null,
  };
}

export default async function handler(_req, res) {
  try {
    const data  = await getGames();
    const games = data.games ?? (Array.isArray(data) ? data : []);
    res.json({ matches: games.map(transformGame) });
  } catch (err) {
    console.error('[matches]', err.message);
    res.status(500).json({ error: err.message });
  }
}
