import { Match, SweepstakeEntry } from '../types';
import { getFlag, formatAEST, matchesCountry, normaliseCountry } from '../utils/helpers';

interface Props {
  matches: Match[];
  sweepstake: SweepstakeEntry[];
}

// Bracket columns, in order. THIRD_PLACE is handled separately below so it
// doesn't break the halving pattern the connector lines rely on.
const STAGES: { key: string; label: string }[] = [
  { key: 'LAST_32',        label: 'Round of 32' },
  { key: 'ROUND_OF_16',    label: 'Round of 16' },
  { key: 'QUARTER_FINALS', label: 'Quarter-finals' },
  { key: 'SEMI_FINALS',    label: 'Semi-finals' },
  { key: 'FINAL',          label: 'Final' },
];

const PREV_STAGE: Record<string, string> = {
  ROUND_OF_16:    'LAST_32',
  QUARTER_FINALS: 'ROUND_OF_16',
  SEMI_FINALS:    'QUARTER_FINALS',
  FINAL:          'SEMI_FINALS',
};

// Reconstruct the true bracket order by walking the tree from the FINAL back
// through each match's two feeders. A feeder is found either from a
// "Winner Match N" label (unplayed slot) or by locating which earlier-round
// match the resolved team came from (played slot). Depth-first, home-before-away,
// yields each round's matches in correct top-to-bottom bracket order — which the
// connector lines rely on. Match-id order is NOT used: this data source doesn't
// number matches in bracket-adjacent order.
function buildBracketOrder(all: Match[]): Record<string, Match[]> {
  const byId = new Map(all.map(m => [m.id, m]));
  const ordered: Record<string, Match[]> = {
    LAST_32: [], ROUND_OF_16: [], QUARTER_FINALS: [], SEMI_FINALS: [], FINAL: [],
  };

  const feederId = (match: Match, side: 'home' | 'away'): number | null => {
    const labelled = side === 'home' ? match.homeSrcId : match.awaySrcId;
    if (labelled != null && byId.has(labelled)) return labelled;

    // Resolved slot → find the previous-round match this team played in.
    const teamName = side === 'home' ? match.homeTeam.name : match.awayTeam.name;
    const prev = PREV_STAGE[match.stage];
    if (!prev || teamName === 'TBD') return null;
    const feeder = all.find(
      m =>
        m.stage === prev &&
        (matchesCountry(teamName, m.homeTeam.name) || matchesCountry(teamName, m.awayTeam.name))
    );
    return feeder ? feeder.id : null;
  };

  const visited = new Set<number>();
  const walk = (match: Match | null | undefined) => {
    if (!match || visited.has(match.id)) return;
    visited.add(match.id);
    if (ordered[match.stage]) ordered[match.stage].push(match);
    if (match.stage === 'LAST_32') return;
    const h = feederId(match, 'home');
    const a = feederId(match, 'away');
    walk(h != null ? byId.get(h) : null);
    walk(a != null ? byId.get(a) : null);
  };

  walk(all.find(m => m.stage === 'FINAL'));

  // Safety net: append any matches the walk didn't reach (unresolved links),
  // in id order, so nothing silently disappears.
  for (const stage of Object.keys(ordered)) {
    const present = new Set(ordered[stage].map(m => m.id));
    all
      .filter(m => m.stage === stage && !present.has(m.id))
      .sort((x, y) => x.id - y.id)
      .forEach(m => ordered[stage].push(m));
  }

  return ordered;
}

export function KnockoutBracket({ matches, sweepstake }: Props) {
  function personFor(teamName: string): string | null {
    const e = sweepstake.find(s => matchesCountry(s.country, teamName));
    return e ? e.person : null;
  }

  const orderedByStage = buildBracketOrder(matches);

  const columns = STAGES.map(st => ({
    ...st,
    games: orderedByStage[st.key] ?? [],
  })).filter(col => col.games.length > 0);

  const thirdPlace = matches.find(m => m.stage === 'THIRD_PLACE') ?? null;

  if (!columns.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <div className="text-4xl mb-3">🗓️</div>
        <p className="text-pax8-muted font-medium">The knockout stage hasn't started yet.</p>
        <p className="text-pax8-muted text-sm mt-1">
          Once the Round of 32 fixtures are locked in, the bracket will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Full-bleed horizontal-scroll container */}
      <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-x-auto px-4 sm:px-8 pb-6">
        <div className="bracket">
          {columns.map((col, colIdx) => {
            const isLast = colIdx === columns.length - 1;
            return (
              <div key={col.key} className="b-round">
                {/* Round heading — NOT a .b-match, so it draws no connector line */}
                <div className="flex-none px-6 pb-2">
                  <h3 className="b-card text-xs font-bold uppercase tracking-wider text-pax8-blue dark:text-blue-300">
                    {col.label}
                  </h3>
                </div>
                {col.games.map((m, idx) => (
                  <div key={m.id} className="b-match">
                    <MatchCard match={m} personFor={personFor} />
                    {/* Vertical connector on the top match of each pair */}
                    {!isLast && idx % 2 === 0 && idx + 1 < col.games.length && (
                      <span className="b-vert" />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Third-place playoff shown separately */}
      {thirdPlace && (
        <div className="mt-6 max-w-sm mx-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pax8-muted mb-2 text-center">
            Third-place Play-off
          </h3>
          <MatchCard match={thirdPlace} personFor={personFor} />
        </div>
      )}
    </>
  );
}

function MatchCard({ match, personFor }: { match: Match; personFor: (n: string) => string | null }) {
  const isLive     = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';
  const hs = match.score.fullTime.home;
  const as = match.score.fullTime.away;
  const homeWon = isFinished && match.score.winner === 'HOME_TEAM';
  const awayWon = isFinished && match.score.winner === 'AWAY_TEAM';

  return (
    <div
      className={`b-card rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${
        isLive
          ? 'border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Top bar: date + status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 text-[11px]">
        <span className="text-pax8-muted font-medium">
          {formatAEST(match.utcDate, 'EEE, dd MMM')}
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-live-pulse" />
            {match.status === 'PAUSED' ? 'HT' : 'LIVE'}
          </span>
        ) : isFinished ? (
          <span className="font-semibold text-pax8-muted">FT</span>
        ) : (
          <span className="font-semibold text-pax8-blue dark:text-blue-300">
            {formatAEST(match.utcDate, 'HH:mm')}
          </span>
        )}
      </div>

      <TeamRow name={match.homeTeam.name} score={hs} isWinner={homeWon} person={personFor(match.homeTeam.name)} />
      <div className="h-px bg-slate-100 dark:bg-slate-800" />
      <TeamRow name={match.awayTeam.name} score={as} isWinner={awayWon} person={personFor(match.awayTeam.name)} />
    </div>
  );
}

function TeamRow({
  name, score, isWinner, person,
}: {
  name: string;
  score: number | null;
  isWinner: boolean;
  person: string | null;
}) {
  const display = normaliseCountry(name);
  const isTBD = name === 'TBD';

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 ${isWinner ? 'bg-pax8-mint/10' : ''}`}>
      <span className="text-base leading-none">{isTBD ? '⚪' : getFlag(display)}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className={`truncate text-sm ${isWinner ? 'font-bold text-pax8-navy dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          {isTBD ? 'TBD' : display}
        </span>
        {person && (
          <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pax8-blue/10 text-pax8-blue dark:bg-pax8-blue/20 dark:text-blue-300">
            {person}
          </span>
        )}
      </div>
      <span className={`tabular-nums text-sm w-4 text-center ${isWinner ? 'font-bold text-pax8-navy dark:text-white' : 'text-pax8-muted'}`}>
        {score ?? '–'}
      </span>
      {isWinner && <span className="text-pax8-mint text-xs">◄</span>}
    </div>
  );
}
