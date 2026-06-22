// ── API response shapes from api.football-data.org ──────────────────────────

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface TableEntry {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface StandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: TableEntry[];
}

export interface Score {
  home: number | null;
  away: number | null;
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED';

export interface Match {
  id: number;
  status: MatchStatus;
  stage: string;
  group: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: string;
    fullTime: Score;
    halfTime: Score;
    regularTime: Score | null;
    extraTime: Score | null;
    penalties: Score | null;
  };
  utcDate: string;
  matchday: number | null;
}

// ── App-level types ──────────────────────────────────────────────────────────

export interface SweepstakeEntry {
  person: string;
  country: string;
}

export type SortKey =
  | 'person'
  | 'country'
  | 'group'
  | 'position'
  | 'played'
  | 'won'
  | 'drawn'
  | 'lost'
  | 'gf'
  | 'ga'
  | 'gd'
  | 'points'
  | 'status';

export type SortDir = 'asc' | 'desc';

export interface SortConfig {
  key: SortKey;
  dir: SortDir;
}

export interface ParticipantRow {
  person: string;
  country: string;
  tableEntry: TableEntry | null;
  group: string;
  liveMatch: Match | null;
  nextFixture: Match | null;
  tournamentStatus: string;
  recentResults: Match[];
}
