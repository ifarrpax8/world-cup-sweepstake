import { ParticipantRow, Scorer } from '../types';
import { getFlag, formatAEST, getMatchSummary, matchesCountry } from '../utils/helpers';

interface Props {
  row: ParticipantRow;
  onClose: () => void;
}

export function DetailPanel({ row, onClose }: Props) {

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFlag(row.country)}</span>
            <div>
              <h2 className="text-lg font-bold">{row.country}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{row.person}'s pick · {row.group}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Live match */}
          {row.liveMatch && (() => {
            const m = row.liveMatch;
            const isHome = matchesCountry(row.country, m.homeTeam.name);
            const hs = m.score.fullTime.home ?? 0;
            const as_ = m.score.fullTime.away ?? 0;
            const myScorers  = isHome ? m.homeScorers : m.awayScorers;
            const oppScorers = isHome ? m.awayScorers : m.homeScorers;
            return (
              <section>
                <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-live-pulse inline-block" />
                  Live Now
                </h3>
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{m.homeTeam.name}</span>
                    <span className="text-lg tabular-nums">{hs}–{as_}</span>
                    <span>{m.awayTeam.name}</span>
                  </div>
                  {myScorers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {myScorers.map((s, i) => <ScorerPill key={i} scorer={s} />)}
                    </div>
                  )}
                  {oppScorers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 opacity-50">
                      {oppScorers.map((s, i) => <ScorerPill key={i} scorer={s} />)}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}

          {/* Stats row */}
          {row.tableEntry && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Points', value: row.tableEntry.points },
                { label: 'W–D–L', value: `${row.tableEntry.won}–${row.tableEntry.draw}–${row.tableEntry.lost}` },
                { label: 'GD', value: row.tableEntry.goalDifference > 0 ? `+${row.tableEntry.goalDifference}` : row.tableEntry.goalDifference },
                { label: 'Position', value: `${row.tableEntry.position}${ordinal(row.tableEntry.position)}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent results */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Recent Results
            </h3>
            {row.recentResults.length === 0 ? (
              <p className="text-sm text-gray-400">No results yet</p>
            ) : (
              <ul className="space-y-3">
                {row.recentResults.map(m => {
                  const isHome = matchesCountry(row.country, m.homeTeam.name);
                  const scorers = isHome ? m.homeScorers : m.awayScorers;
                  return (
                    <li key={m.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{getMatchSummary(row.country, m)}</span>
                        <span className="text-xs text-gray-400">{formatAEST(m.utcDate, 'dd MMM')}</span>
                      </div>
                      {scorers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {scorers.map((s, i) => <ScorerPill key={i} scorer={s} />)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Next fixture */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Next Fixture
            </h3>
            {row.nextFixture ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm">
                <p className="font-medium">
                  {row.nextFixture.homeTeam.name} vs {row.nextFixture.awayTeam.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatAEST(row.nextFixture.utcDate)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No upcoming fixtures</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

function ScorerPill({ scorer }: { scorer: Scorer }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
      {scorer.ownGoal ? '🔄' : '⚽'} {scorer.name} {scorer.minute}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
