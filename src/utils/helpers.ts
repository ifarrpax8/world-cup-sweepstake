import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Match, TableEntry, ParticipantRow } from '../types';

const AEST = 'Australia/Brisbane';

export function toAEST(utcDate: string): Date {
  return toZonedTime(parseISO(utcDate), AEST);
}

export function formatAEST(utcDate: string, fmt = 'dd MMM, HH:mm'): string {
  return `${format(toAEST(utcDate), fmt)} AEST`;
}

export function formatNowAEST(): string {
  return format(toZonedTime(new Date(), AEST), 'HH:mm:ss') + ' AEST';
}

// Maps API team names → the names used in sweepstake.ts config
const API_NAME_MAP: Record<string, string> = {
  'United States':                     'USA',
  "Côte d'Ivoire":                     'Ivory Coast',
  'Czech Republic':                    'Czechia',
  'Korea Republic':                    'South Korea',
  'IR Iran':                           'Iran',
  'Congo DR':                          'DR Congo',
  'Democratic Republic of Congo':      'DR Congo',
  'Democratic Republic of the Congo':  'DR Congo',
  'D.R. Congo':                        'DR Congo',
  'DRC':                               'DR Congo',
  'Bosnia and Herzegovina':            'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':                'Bosnia & Herzegovina',
  'Bosnia-Hercegovina':                'Bosnia & Herzegovina',
};

export function normaliseCountry(apiName: string): string {
  return API_NAME_MAP[apiName] ?? apiName;
}

const FLAGS: Record<string, string> = {
  Algeria:                  '🇩🇿',
  Argentina:                '🇦🇷',
  Australia:                '🇦🇺',
  Austria:                  '🇦🇹',
  Belgium:                  '🇧🇪',
  Bolivia:                  '🇧🇴',
  'Bosnia & Herzegovina':   '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  Brazil:                   '🇧🇷',
  Canada:                   '🇨🇦',
  Cameroon:                 '🇨🇲',
  'Cape Verde':             '🇨🇻',
  Chile:                    '🇨🇱',
  Colombia:                 '🇨🇴',
  'Congo DR':               '🇨🇩',
  'DR Congo':               '🇨🇩',
  'Costa Rica':             '🇨🇷',
  Croatia:                  '🇭🇷',
  Cuba:                     '🇨🇺',
  Curaçao:                  '🇨🇼',
  Czechia:                  '🇨🇿',
  Denmark:                  '🇩🇰',
  Ecuador:                  '🇪🇨',
  Egypt:                    '🇪🇬',
  'El Salvador':            '🇸🇻',
  England:                  '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France:                   '🇫🇷',
  Germany:                  '🇩🇪',
  Ghana:                    '🇬🇭',
  Greece:                   '🇬🇷',
  Haiti:                    '🇭🇹',
  Honduras:                 '🇭🇳',
  Hungary:                  '🇭🇺',
  Indonesia:                '🇮🇩',
  Iran:                     '🇮🇷',
  Iraq:                     '🇮🇶',
  Israel:                   '🇮🇱',
  'Ivory Coast':            '🇨🇮',
  Jamaica:                  '🇯🇲',
  Japan:                    '🇯🇵',
  Jordan:                   '🇯🇴',
  Mali:                     '🇲🇱',
  Mauritania:               '🇲🇷',
  Mexico:                   '🇲🇽',
  Morocco:                  '🇲🇦',
  Netherlands:              '🇳🇱',
  'New Zealand':            '🇳🇿',
  Nigeria:                  '🇳🇬',
  Norway:                   '🇳🇴',
  Panama:                   '🇵🇦',
  Paraguay:                 '🇵🇾',
  Peru:                     '🇵🇪',
  Poland:                   '🇵🇱',
  Portugal:                 '🇵🇹',
  Qatar:                    '🇶🇦',
  Romania:                  '🇷🇴',
  'Saudi Arabia':           '🇸🇦',
  Scotland:                 '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Senegal:                  '🇸🇳',
  Serbia:                   '🇷🇸',
  Slovakia:                 '🇸🇰',
  'South Africa':           '🇿🇦',
  'South Korea':            '🇰🇷',
  Spain:                    '🇪🇸',
  Sweden:                   '🇸🇪',
  Switzerland:              '🇨🇭',
  'Trinidad and Tobago':    '🇹🇹',
  Tunisia:                  '🇹🇳',
  Turkey:                   '🇹🇷',
  Turkiye:                  '🇹🇷',
  Ukraine:                  '🇺🇦',
  Uruguay:                  '🇺🇾',
  USA:                      '🇺🇸',
  'United States':          '🇺🇸',
  Uzbekistan:               '🇺🇿',
  Venezuela:                '🇻🇪',
  Wales:                    '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
};

export function getFlag(country: string): string {
  return FLAGS[country] ?? '🏳️';
}

export function groupLabel(group: string | null): string {
  if (!group) return '—';
  return group.replace('GROUP_', 'Group ');
}

// Collapses every known alias of a country to ONE canonical key.
// Add a country's aliases to the same array and they will all match.
const ALIAS_GROUPS: string[][] = [
  ['USA', 'United States', 'United States of America', 'US'],
  ['DR Congo', 'Congo DR', 'Democratic Republic of Congo', 'Democratic Republic of the Congo', 'DRC', 'D.R. Congo', 'Dem. Rep. Congo'],
  ['Bosnia & Herzegovina', 'Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia-Hercegovina', 'Bosnia'],
  ['Ivory Coast', "Côte d'Ivoire", 'Cote d Ivoire'],
  ['Czechia', 'Czech Republic'],
  ['South Korea', 'Korea Republic', 'Republic of Korea'],
  ['Iran', 'IR Iran'],
  ['Turkey', 'Turkiye', 'Türkiye'],
];

// Build a lookup: any alias (simplified) → canonical key
const CANONICAL = new Map<string, string>();
for (const group of ALIAS_GROUPS) {
  const canonical = group[0];
  for (const alias of group) {
    CANONICAL.set(simplify(alias), canonical);
  }
}

function simplify(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function canonicalKey(name: string): string {
  const s = simplify(name);
  return CANONICAL.get(s) ?? s;
}

export function matchesCountry(configName: string, apiName: string): boolean {
  if (!configName || !apiName) return false;
  return canonicalKey(configName) === canonicalKey(apiName);
}

export function findTableEntry(country: string, allEntries: TableEntry[]): TableEntry | null {
  return allEntries.find(e => matchesCountry(country, e.team.name)) ?? null;
}

export function findGroup(
  country: string,
  standingGroups: { group: string | null; table: TableEntry[] }[]
): string {
  for (const sg of standingGroups) {
    const found = sg.table.find(e => matchesCountry(country, e.team.name));
    if (found) return groupLabel(sg.group);
  }
  return '—';
}

export function getLiveMatch(country: string, matches: Match[]): Match | null {
  return matches.find(
    m =>
      (m.status === 'IN_PLAY' || m.status === 'PAUSED') &&
      (matchesCountry(country, m.homeTeam.name) || matchesCountry(country, m.awayTeam.name))
  ) ?? null;
}

export function getNextFixture(country: string, matches: Match[]): Match | null {
  return matches
    .filter(
      m =>
        (m.status === 'SCHEDULED' || m.status === 'TIMED') &&
        (matchesCountry(country, m.homeTeam.name) || matchesCountry(country, m.awayTeam.name))
    )
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0] ?? null;
}

export function getRecentResults(country: string, matches: Match[]): Match[] {
  return matches
    .filter(
      m =>
        m.status === 'FINISHED' &&
        (matchesCountry(country, m.homeTeam.name) || matchesCountry(country, m.awayTeam.name))
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 5);
}

const STAGE_ORDER = [
  'GROUP_STAGE', 'LAST_32', 'ROUND_OF_16', 'LAST_16',
  'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
];

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE:    'Group Stage',
  LAST_32:        'Round of 32',
  ROUND_OF_16:    'Round of 16',
  LAST_16:        'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS:    'Semi-final',
  THIRD_PLACE:    'Third Place',
  FINAL:          'Final',
};

function didTeamWinMatch(country: string, match: Match): boolean {
  const isHome = matchesCountry(country, match.homeTeam.name);
  const winner = match.score.winner;
  if (!winner) return false;
  return (isHome && winner === 'HOME_TEAM') || (!isHome && winner === 'AWAY_TEAM');
}

export function getTournamentStatus(country: string, matches: Match[]): string {
  const knockoutFinished = matches.filter(
    m =>
      m.status === 'FINISHED' &&
      m.stage !== 'GROUP_STAGE' &&
      (matchesCountry(country, m.homeTeam.name) || matchesCountry(country, m.awayTeam.name))
  );

  if (!knockoutFinished.length) return 'Group Stage';

  for (const stage of [...STAGE_ORDER].reverse()) {
    if (stage === 'GROUP_STAGE') continue;
    const stageMatches = knockoutFinished.filter(m => m.stage === stage);
    if (!stageMatches.length) continue;

    const lastMatch = stageMatches.at(-1)!;
    const won = didTeamWinMatch(country, lastMatch);

    if (stage === 'FINAL') return won ? '🏆 Champions!' : 'Runner-up';
    if (stage === 'THIRD_PLACE') return won ? '3rd Place' : '4th Place';
    if (!won) return `Eliminated (${STAGE_LABELS[stage] ?? stage})`;

    const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
    return STAGE_LABELS[nextStage] ?? STAGE_LABELS[stage];
  }

  return 'Group Stage';
}

export function stageScore(status: string): number {
  if (status.includes('Champions'))   return 100;
  if (status.includes('Runner-up'))   return 90;
  if (status === '3rd Place')         return 85;
  if (status === '4th Place')         return 82;
  if (status.includes('Final'))       return 80;
  if (status.includes('Semi-final'))  return 70;
  if (status.includes('Quarter-final')) return 60;
  if (status.includes('Round of 16')) return 50;
  if (status.includes('Round of 32')) return 40;
  if (status.includes('Eliminated')) return 5;
  return 30;
}

export function getLeaderIndex(rows: ParticipantRow[]): number {
  let best = -1;
  let leaderIdx = 0;
  rows.forEach((row, idx) => {
    const score =
      stageScore(row.tournamentStatus) * 10000 +
      (row.tableEntry?.points ?? 0) * 100 +
      (row.tableEntry?.goalDifference ?? -99);
    if (score > best) { best = score; leaderIdx = idx; }
  });
  return leaderIdx;
}

export function getMatchSummary(country: string, match: Match): string {
  const isHome = matchesCountry(country, match.homeTeam.name);
  const hs = match.score.fullTime.home;
  const as = match.score.fullTime.away;
  if (hs === null || as === null) return '—';
  const my = isHome ? hs : as;
  const their = isHome ? as : hs;
  const opp = normaliseCountry(isHome ? match.awayTeam.name : match.homeTeam.name);
  const r = my > their ? 'W' : my < their ? 'L' : 'D';
  return `${r} ${my}–${their} vs ${opp}`;
}
