import { ParticipantRow, SortConfig, SortKey } from '../types';
import { getFlag, formatAEST, groupLabel } from '../utils/helpers';
import { LiveIndicator } from './LiveIndicator';

interface Props {
  rows: ParticipantRow[];
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  leaderIdx: number;
  onSelectRow: (idx: number) => void;
  flashedCountries: Set<string>;
}

interface ColDef { key: SortKey; label: string; mobileHide?: boolean; }

const COLUMNS: ColDef[] = [
  { key: 'person',   label: 'Participant' },
  { key: 'country',  label: 'Country' },
  { key: 'group',    label: 'Group',   mobileHide: true },
  { key: 'position', label: 'Pos',     mobileHide: true },
  { key: 'played',   label: 'P',       mobileHide: true },
  { key: 'won',      label: 'W',       mobileHide: true },
  { key: 'drawn',    label: 'D',       mobileHide: true },
  { key: 'lost',     label: 'L',       mobileHide: true },
  { key: 'gf',       label: 'GF',      mobileHide: true },
  { key: 'ga',       label: 'GA',      mobileHide: true },
  { key: 'gd',       label: 'GD',      mobileHide: true },
  { key: 'points',   label: 'Pts' },
  { key: 'status',   label: 'Status',  mobileHide: true },
];

export function Table({ rows, sortConfig, onSort, leaderIdx, onSelectRow, flashedCountries }: Props) {
  function cellValue(row: ParticipantRow, key: SortKey): React.ReactNode {
    const e = row.tableEntry;
    switch (key) {
      case 'person':
        return <span className="font-semibold text-pax8-navy dark:text-white">{row.person}</span>;
      case 'country':
        return (
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{getFlag(row.country)}</span>
              <span className="font-medium text-pax8-navy dark:text-slate-100">{row.country}</span>
            </span>
            {row.liveMatch && <LiveIndicator country={row.country} liveMatch={row.liveMatch} />}
          </span>
        );
      case 'group':    return <span className="text-pax8-muted">{e ? groupLabel(row.group) : '—'}</span>;
      case 'position': return e ? <span className="font-medium">{e.position}</span> : '—';
      case 'played':   return e ? e.playedGames : '—';
      case 'won':      return e ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{e.won}</span> : '—';
      case 'drawn':    return e ? e.draw : '—';
      case 'lost':     return e ? <span className="text-red-500 dark:text-red-400">{e.lost}</span> : '—';
      case 'gf':       return e ? e.goalsFor : '—';
      case 'ga':       return e ? e.goalsAgainst : '—';
      case 'gd': {
        if (!e) return '—';
        const gd = e.goalDifference;
        return (
          <span className={`font-medium tabular-nums ${gd > 0 ? 'text-emerald-600 dark:text-emerald-400' : gd < 0 ? 'text-red-500' : 'text-pax8-muted'}`}>
            {gd > 0 ? `+${gd}` : gd}
          </span>
        );
      }
      case 'points':
        return (
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-pax8-blue/10 dark:bg-pax8-blue/20 text-pax8-blue dark:text-blue-300 font-bold text-sm tabular-nums">
            {e ? e.points : '—'}
          </span>
        );
      case 'status': {
        const s = row.tournamentStatus;
        const isChamp = s.includes('Champions');
        const isElim  = s.startsWith('Eliminated');
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isChamp ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
            isElim  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' :
                      'bg-pax8-blue/10 text-pax8-blue dark:bg-pax8-blue/20 dark:text-blue-300'
          }`}>
            {s}
          </span>
        );
      }
      default: return '—';
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-pax8-navy dark:bg-slate-800 text-white/70 text-xs uppercase tracking-wider">
            <th className="px-4 py-3.5 text-left w-8 text-white/40">#</th>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className={`px-3 py-3.5 text-left cursor-pointer hover:text-white transition-colors select-none ${col.mobileHide ? 'hidden sm:table-cell' : ''}`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="text-pax8-mint">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
            <th className="px-3 py-3.5 text-left hidden md:table-cell text-white/70">Next Fixture</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, idx) => {
            const isLeader   = idx === leaderIdx;
            const isFlashing = flashedCountries.has(row.country);
            const isLive     = !!row.liveMatch;

            return (
              <tr
                key={row.country}
                onClick={() => onSelectRow(idx)}
                className={[
                  'cursor-pointer transition-all duration-150',
                  isFlashing ? 'animate-flash' : '',
                  isLeader   ? 'leader-glow' : '',
                  isLive
                    ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'hover:bg-pax8-light/60 dark:hover:bg-slate-800/60',
                ].filter(Boolean).join(' ')}
              >
                <td className="px-4 py-3.5 text-pax8-muted text-xs font-medium">
                  {isLeader ? (
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pax8-mint text-pax8-navy font-bold text-xs">🏆</span>
                  ) : idx + 1}
                </td>
                {COLUMNS.map(col => (
                  <td key={col.key} className={`px-3 py-3.5 ${col.mobileHide ? 'hidden sm:table-cell' : ''}`}>
                    {cellValue(row, col.key)}
                  </td>
                ))}
                <td className="px-3 py-3.5 hidden md:table-cell text-xs text-pax8-muted">
                  {row.nextFixture
                    ? `${row.nextFixture.homeTeam.name} vs ${row.nextFixture.awayTeam.name} · ${formatAEST(row.nextFixture.utcDate)}`
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
