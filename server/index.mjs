import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const API = 'https://worldcup26.ir';

app.use(cors());

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

const gamesCache    = createCache(30_000);   // 30s — matches poll interval
const teamsCache    = createCache(300_000);  // 5min — team list is static
const offsetsCache  = createCache(3_600_000); // 1hr — stadium list is static

async function getGames() {
  const cached = gamesCache.get('games');
  if (cached) return cached;
  const data = await fetchJSON(`${API}/get/games`);
  gamesCache.set('games', data);
  return data;
}

async function getTeams() {
  const cached = teamsCache.get('teams');
  if (cached) return cached;
  const data = await fetchJSON(`${API}/get/teams`);
  teamsCache.set('teams', data);
  return data;
}

async function getVenueOffsets() {
  const cached = offsetsCache.get('offsets');
  if (cached) return cached;
  const offsets = await buildVenueOffsets();
  offsetsCache.set('offsets', offsets);
  return offsets;
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

function parseScorers(raw) {
  if (!raw || raw === 'null') return [];
  const entries = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const str = m[1];
    const ownGoal = str.includes('(OG)');
    const parts = str.split(' ');
    let nameEnd = parts.length;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^\d/.test(parts[i])) { nameEnd = i; break; }
    }
    const name = parts.slice(0, nameEnd).join(' ');
    const minute = parts.slice(nameEnd).join(' ').replace(/\(OG\)/g, '').trim();
    entries.push({ name: name || str, minute, ownGoal });
  }
  return entries;
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

// The API's local_date is the VENUE'S local kickoff time. Host cities span
// several timezones, so we convert each match using its stadium's offset.
// Values = hours to ADD to venue-local time to get UTC, for the tournament
// window (Jun–Jul 2026: US/Canada on daylight time, Mexico on standard time).
function cityOffset(city = '', country = '') {
  const c = `${city} ${country}`.toLowerCase();
  if (/vancouver|seattle|san francisco|santa clara|los angeles|inglewood/.test(c)) return 7; // Pacific (PDT)
  if (/dallas|arlington|houston|kansas/.test(c)) return 5;                                    // Central US (CDT)
  if (/mexico|guadalajara|monterrey/.test(c)) return 6;                                       // Mexico (no DST)
  return 4;                                                                                    // Eastern (EDT) — default
}

function toUtcISO(localDate, offsetHours) {
  if (!localDate) return new Date().toISOString();
  try {
    const [dp, tp = '00:00'] = localDate.split(' ');
    const [mo, dy, yr] = dp.split('/').map(Number);
    const [h, mi] = tp.split(':').map(Number);
    const ms = Date.UTC(yr, mo - 1, dy, h, mi) + offsetHours * 3600 * 1000;
    return new Date(ms).toISOString();
  } catch { return new Date().toISOString(); }
}

// Fetch the stadium list and build stadium_id → UTC offset.
async function buildVenueOffsets() {
  try {
    const data = await fetchJSON(`${API}/get/stadiums`);
    const stadiums = data.stadiums ?? (Array.isArray(data) ? data : []);
    const map = {};
    stadiums.forEach(s => { map[String(s.id)] = cityOffset(s.city_en, s.country_en); });
    return map;
  } catch {
    return {}; // fall back to Eastern for every match if the list is unavailable
  }
}

function transformGame(g, offsets = {}) {
  const hs=parseInt(g.home_score)||0, as_=parseInt(g.away_score)||0;
  const fin = g.finished==='TRUE'||g.finished===true||g.finished===1;
  const status = mapStatus(g.time_elapsed, g.finished);
  // Show a scoreline for any match that has kicked off (live or finished),
  // not just finished ones — so live scores appear in the table and bracket.
  const started = status === 'FINISHED' || status === 'IN_PLAY' || status === 'PAUSED';
  const offset = offsets[String(g.stadium_id)] ?? 4;
  return {
    id: parseInt(g.id),
    status,
    stage:  mapStage(g.type),
    group:  g.type==='group' ? `GROUP_${g.group}` : null,
    homeTeam: { id:parseInt(g.home_team_id)||0, name:norm(g.home_team_name_en||g.home_team_label||'TBD'), shortName:norm(g.home_team_name_en||'TBD'), tla:'', crest:'' },
    awayTeam: { id:parseInt(g.away_team_id)||0, name:norm(g.away_team_name_en||g.away_team_label||'TBD'), shortName:norm(g.away_team_name_en||'TBD'), tla:'', crest:'' },
    score: {
      winner: fin?(hs>as_?'HOME_TEAM':as_>hs?'AWAY_TEAM':'DRAW'):null,
      duration:'REGULAR',
      fullTime:{ home:started?hs:null, away:started?as_:null },
      halfTime:{ home:null, away:null },
      regularTime:null, extraTime:null, penalties:null,
    },
    homeScorers: parseScorers(g.home_scorers),
    awayScorers: parseScorers(g.away_scorers),
    utcDate: toUtcISO(g.local_date, offset),
    matchday: parseInt(g.matchday)||null,
  };
}

app.get('/api/matches', async (_req, res) => {
  try {
    const [data, offsets] = await Promise.all([getGames(), getVenueOffsets()]);
    const games = data.games ?? (Array.isArray(data) ? data : []);
    res.json({ matches: games.map(g => transformGame(g, offsets)) });
  } catch (err) {
    console.error('[matches]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/standings', async (_req, res) => {
  try {
    const [gd, td] = await Promise.all([getGames(), getTeams()]);
    const games = gd.games ?? (Array.isArray(gd) ? gd : []);
    const teams = td.teams ?? (Array.isArray(td) ? td : []);

    const teamById = {};
    teams.forEach(t => { teamById[String(t.id)] = norm(t.name_en ?? t.name); });

    const teamStats  = {};
    const groupTeams = {};

    games.filter(g=>(g.type??'').toLowerCase()==='group').forEach(g => {
      const grp = g.group;
      if (!grp) return;
      if (!groupTeams[grp]) groupTeams[grp] = new Set();

      [
        { tid:String(g.home_team_id), name:g.home_team_name_en },
        { tid:String(g.away_team_id), name:g.away_team_name_en },
      ].forEach(({tid,name}) => {
        if (!tid||tid==='0') return;
        groupTeams[grp].add(tid);
        if (!teamStats[tid]) {
          teamStats[tid] = { name: teamById[tid] ?? norm(name) ?? 'Unknown', played:0, won:0, draw:0, lost:0, gf:0, ga:0 };
        }
      });

      const fin = g.finished==='TRUE'||g.finished===true||g.finished===1;
      if (!fin) return;
      const hs=parseInt(g.home_score)||0, as_=parseInt(g.away_score)||0;
      const hid=String(g.home_team_id), aid=String(g.away_team_id);

      if (teamStats[hid]) {
        teamStats[hid].played++; teamStats[hid].gf+=hs; teamStats[hid].ga+=as_;
        if (hs>as_) teamStats[hid].won++; else if (hs===as_) teamStats[hid].draw++; else teamStats[hid].lost++;
      }
      if (teamStats[aid]) {
        teamStats[aid].played++; teamStats[aid].gf+=as_; teamStats[aid].ga+=hs;
        if (as_>hs) teamStats[aid].won++; else if (as_===hs) teamStats[aid].draw++; else teamStats[aid].lost++;
      }
    });

    const standings = Object.entries(groupTeams).map(([grp, tidSet]) => {
      const table = [...tidSet].map(tid => {
        const s=teamStats[tid], pts=s.won*3+s.draw;
        return { team:{id:parseInt(tid)||0,name:s.name,shortName:s.name,tla:'',crest:''}, playedGames:s.played, won:s.won, draw:s.draw, lost:s.lost, points:pts, goalsFor:s.gf, goalsAgainst:s.ga, goalDifference:s.gf-s.ga };
      }).sort((a,b)=>b.points-a.points||b.goalDifference-a.goalDifference||b.goalsFor-a.goalsFor);
      table.forEach((t,i)=>{t.position=i+1;});
      return { stage:'GROUP_STAGE', type:'TOTAL', group:`GROUP_${grp}`, table };
    });

    res.json({ standings });
  } catch (err) {
    console.error('[standings]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy ready on http://localhost:${PORT}`));
