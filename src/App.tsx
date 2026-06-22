import { useState, useEffect, useRef, useMemo } from 'react';
import { ParticipantRow, SortConfig, SortKey } from './types';
import { SWEEPSTAKE } from './config/sweepstake';
import { useFootballData } from './hooks/useFootballData';
import {
  findTableEntry, findGroup, getLiveMatch, getNextFixture,
  getRecentResults, getTournamentStatus, getLeaderIndex,
} from './utils/helpers';
import { Table } from './components/Table';
import { DetailPanel } from './components/DetailPanel';
import { Confetti } from './components/Confetti';

export default function App() {
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'points', dir: 'desc' });
  const [filterGroup, setFilterGroup]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null);
  const [flashedCountries, setFlashedCountries] = useState<Set<string>>(new Set());
  const [confettiActive, setConfettiActive]     = useState(false);

  const { standingGroups, allEntries, matches, lastUpdated, lastFetchedAt, isLoading, error } =
    useFootballData();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const allRows: ParticipantRow[] = useMemo(() =>
    SWEEPSTAKE.map(entry => ({
      person:           entry.person,
      country:          entry.country,
      tableEntry:       findTableEntry(entry.country, allEntries),
      group:            findGroup(entry.country, standingGroups),
      liveMatch:        getLiveMatch(entry.country, matches),
      nextFixture:      getNextFixture(entry.country, matches),
      tournamentStatus: getTournamentStatus(entry.country, matches),
      recentResults:    getRecentResults(entry.country, matches),
    })),
    [allEntries, standingGroups, matches]
  );

  // Flash rows when match data changes
  const prevMatchesRef = useRef<string>('');
  useEffect(() => {
    const key = matches
      .map(m => `${m.id}:${m.score.fullTime.home}-${m.score.fullTime.away}:${m.status}`)
      .join('|');
    if (prevMatchesRef.current && key !== prevMatchesRef.current) {
      const changed = new Set(allRows.filter(r => r.liveMatch).map(r => r.country));
      if (changed.size > 0) {
        setFlashedCountries(changed);
        setTimeout(() => setFlashedCountries(new Set()), 1500);
      }
    }
    prevMatchesRef.current = key;
  }, [matches, allRows]);

  // Confetti when champion found
  useEffect(() => {
    if (allRows.some(r => r.tournamentStatus.includes('Champions'))) setConfettiActive(true);
  }, [allRows]);

  const availableGroups = useMemo(() =>
    [...new Set(allRows.map(r => r.group).filter(g => g !== '—'))].sort(),
    [allRows]
  );

  const filteredRows = useMemo(() =>
    allRows.filter(row => {
      if (filterGroup  && row.group !== filterGroup) return false;
      if (filterStatus && !row.tournamentStatus.toLowerCase().includes(filterStatus.toLowerCase())) return false;
      if (filterPerson && !row.person.toLowerCase().includes(filterPerson.toLowerCase())) return false;
      return true;
    }),
    [allRows, filterGroup, filterStatus, filterPerson]
  );

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const dir = sortConfig.dir === 'asc' ? 1 : -1;
      const e1 = a.tableEntry;
      const e2 = b.tableEntry;
      switch (sortConfig.key) {
        case 'person':   return dir * a.person.localeCompare(b.person);
        case 'country':  return dir * a.country.localeCompare(b.country);
        case 'group':    return dir * a.group.localeCompare(b.group);
        case 'position': return dir * ((e1?.position ?? 99) - (e2?.position ?? 99));
        case 'played':   return dir * ((e1?.playedGames ?? 0) - (e2?.playedGames ?? 0));
        case 'won':      return dir * ((e1?.won ?? 0) - (e2?.won ?? 0));
        case 'drawn':    return dir * ((e1?.draw ?? 0) - (e2?.draw ?? 0));
        case 'lost':     return dir * ((e1?.lost ?? 0) - (e2?.lost ?? 0));
        case 'gf':       return dir * ((e1?.goalsFor ?? 0) - (e2?.goalsFor ?? 0));
        case 'ga':       return dir * ((e1?.goalsAgainst ?? 0) - (e2?.goalsAgainst ?? 0));
        case 'gd':       return dir * ((e1?.goalDifference ?? -99) - (e2?.goalDifference ?? -99));
        case 'points':   return dir * ((e1?.points ?? 0) - (e2?.points ?? 0));
        case 'status':   return dir * a.tournamentStatus.localeCompare(b.tournamentStatus);
        default:         return 0;
      }
    });
  }, [filteredRows, sortConfig]);

  const leaderIdx = useMemo(() => getLeaderIndex(sortedRows), [sortedRows]);
  const liveCount = allRows.filter(r => r.liveMatch).length;
  const isStale = lastFetchedAt !== null && Date.now() - lastFetchedAt > 90_000;

  function handleSort(key: SortKey) {
    setSortConfig(prev =>
      prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }
    );
  }

  const selectedRow = selectedIdx !== null ? sortedRows[selectedIdx] ?? null : null;

  return (
    <div className="min-h-screen">
      <Confetti trigger={confettiActive} />

      {/* Pax8-branded header */}
      <header className="shimmer-bg text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              {/* Pax8 wordmark */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/60">PAX8</span>
                <span className="h-3 w-px bg-white/30" />
                <span className="text-xs font-medium text-white/60 tracking-wide">Brisbane Office</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                🏆 World Cup 2026 Sweepstake
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-white/70">
                  Updated {lastUpdated}
                </p>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/20">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-live-pulse" />
                    {liveCount} live now
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setDarkMode(d => !d)}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-semibold backdrop-blur"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      {/* Mint accent bar */}
      <div className="h-1 bg-gradient-to-r from-pax8-blue via-pax8-mint to-pax8-blue" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search participant…"
            value={filterPerson}
            onChange={e => setFilterPerson(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-pax8-blue/50 dark:text-white"
          />
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-pax8-blue/50 dark:text-white"
          >
            <option value="">All Groups</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-pax8-blue/50 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="Group Stage">Group Stage</option>
            <option value="Round of 32">Round of 32</option>
            <option value="Round of 16">Round of 16</option>
            <option value="Quarter-final">Quarter-finals</option>
            <option value="Semi-final">Semi-finals</option>
            <option value="Final">Final</option>
            <option value="Eliminated">Eliminated</option>
            <option value="Champions">🏆 Champions</option>
          </select>
          {(filterGroup || filterStatus || filterPerson) && (
            <button
              onClick={() => { setFilterGroup(''); setFilterStatus(''); setFilterPerson(''); }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-pax8-muted hover:text-pax8-navy dark:hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Staleness warning */}
        {isStale && !error && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm animate-fade-in">
            ⚠️ Live data hasn't refreshed in over 90 seconds — the upstream API may be slow.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm animate-fade-in">
            ⚠️ Could not load live data. Check your connection and try refreshing. ({error})
          </div>
        )}

        {/* Loading */}
        {isLoading && !error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-4 border-pax8-light dark:border-slate-700 border-t-pax8-blue animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">⚽</div>
            </div>
            <p className="text-pax8-muted text-sm font-medium">Loading live World Cup data…</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <Table
              rows={sortedRows}
              sortConfig={sortConfig}
              onSort={handleSort}
              leaderIdx={leaderIdx}
              onSelectRow={setSelectedIdx}
              flashedCountries={flashedCountries}
            />
            <p className="mt-3 text-xs text-pax8-muted text-right">
              Showing {sortedRows.length} of {allRows.length} participants
            </p>
          </div>
        )}
      </main>

      {selectedRow && (
        <DetailPanel row={selectedRow} onClose={() => setSelectedIdx(null)} />
      )}
    </div>
  );
}
