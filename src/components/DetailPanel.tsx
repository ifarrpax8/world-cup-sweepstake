import { ParticipantRow, Scorer } from '../types';
import { getFlag, formatAEST, getMatchSummary, matchesCountry } from '../utils/helpers';

interface Props {
  row: ParticipantRow;
  scorers: Scorer[];
  onClose: () => void;
}

export function DetailPanel({ row, scorers, onClose }: Props) {
  const countryScorers = scorers.filter(s => matchesCountry(row.country, s.team.name));

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
              <ul className="space-y-1.5">
                {row.recentResults.map(m => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{getMatchSummary(row.country, m)}</span>
                    <span className="text-xs text-gray-400">{formatAEST(m.utcDate, 'dd MMM')}</span>
                  </li>
                ))}
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

          {/* Top scorers for this nation */}
          {countryScorers.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Top Scorers
              </h3>
              <ul className="space-y-1.5">
                {countryScorers.slice(0, 5).map(s => (
                  <li key={s.player.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-200">{s.player.name}</span>
                    <span className="font-semibold tabular-nums">{s.goals} ⚽</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
