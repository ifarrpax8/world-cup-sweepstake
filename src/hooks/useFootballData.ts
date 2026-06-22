import { useState, useEffect, useRef, useCallback } from 'react';
import { StandingGroup, Match, Scorer, TableEntry } from '../types';
import { SWEEPSTAKE } from '../config/sweepstake';

// How often to re-fetch each endpoint (milliseconds).
// football-data.org free tier: 10 requests/minute.
// 3 endpoints × (1/30s + 1/120s + 1/300s) ≈ 5 req/min — safely within limits.
const MATCHES_INTERVAL  = 30_000;   // 30 s  — scores change here
const STANDINGS_INTERVAL = 120_000;  // 2 min — group tables
const SCORERS_INTERVAL   = 300_000;  // 5 min — top scorers

async function fetcher<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json() as Promise<T>;
}

export interface FootballData {
  standingGroups: StandingGroup[];
  allEntries: TableEntry[];    // flat list of all group table rows
  matches: Match[];
  scorers: Scorer[];
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

export function useFootballData(): FootballData {
  const [standingGroups, setStandingGroups] = useState<StandingGroup[]>([]);
  const [allEntries, setAllEntries]         = useState<TableEntry[]>([]);
  const [matches, setMatches]               = useState<Match[]>([]);
  const [scorers, setScorers]               = useState<Scorer[]>([]);
  const [lastUpdated, setLastUpdated]       = useState<string>('—');
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  // Track previous match scores to detect changes for browser notifications.
  const prevScoresRef = useRef<Map<number, { home: number | null; away: number | null }>>(new Map());
  const notifPermRef  = useRef<NotificationPermission>('default');

  // Holds in-flight AbortControllers so each new poll can cancel the previous one.
  const abortRefs = useRef<{ matches?: AbortController; standings?: AbortController; scorers?: AbortController }>({});

  // Request browser notification permission once on mount.
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => { notifPermRef.current = p; });
    }
  }, []);

  function sendNotif(title: string, body: string) {
    if (notifPermRef.current === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  }

  function personForCountry(countryApiName: string): string | null {
    // Match API name to config name via the normalise map built into helpers,
    // but do a simple includes check here to avoid circular imports.
    const entry = SWEEPSTAKE.find(
      e => e.country === countryApiName || countryApiName.includes(e.country) || e.country.includes(countryApiName)
    );
    return entry?.person ?? null;
  }

  const checkNotifications = useCallback((newMatches: Match[]) => {
    const prev = prevScoresRef.current;

    for (const m of newMatches) {
      const homeInSweep = personForCountry(m.homeTeam.name);
      const awayInSweep = personForCountry(m.awayTeam.name);
      if (!homeInSweep && !awayInSweep) continue;

      const prevScore = prev.get(m.id);
      const curHome = m.score.fullTime.home;
      const curAway = m.score.fullTime.away;

      if (prevScore) {
        // Detect a new goal.
        if (curHome !== null && curAway !== null) {
          if (curHome !== prevScore.home || curAway !== prevScore.away) {
            if (homeInSweep && curHome !== null && curHome > (prevScore.home ?? 0)) {
              sendNotif(`⚽ Goal! ${m.homeTeam.name}`, `${m.homeTeam.name} ${curHome}–${curAway} ${m.awayTeam.name} — ${homeInSweep}'s team!`);
            }
            if (awayInSweep && curAway !== null && curAway > (prevScore.away ?? 0)) {
              sendNotif(`⚽ Goal! ${m.awayTeam.name}`, `${m.homeTeam.name} ${curHome}–${curAway} ${m.awayTeam.name} — ${awayInSweep}'s team!`);
            }
          }
        }

        // Detect match finished.
        if (m.status === 'FINISHED' && prevScore.home !== null) {
          const who = [homeInSweep && m.homeTeam.name, awayInSweep && m.awayTeam.name]
            .filter(Boolean)
            .join(' & ');
          sendNotif(`🏁 Full time: ${m.homeTeam.name} vs ${m.awayTeam.name}`, `${curHome}–${curAway} — ${who}'s match is over`);
        }
      }

      prev.set(m.id, { home: curHome, away: curAway });
    }
  // SWEEPSTAKE and notifPermRef are module-level / ref — stable, empty deps is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMatches = useCallback(async () => {
    abortRefs.current.matches?.abort();
    const controller = new AbortController();
    abortRefs.current.matches = controller;
    try {
      const data = await fetcher<{ matches: Match[] }>('/api/matches', controller.signal);
      checkNotifications(data.matches);
      setMatches(data.matches);
      setLastUpdated(new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour12: false }) + ' AEST');
      setError(null);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
    }
  }, [checkNotifications]);

  const fetchStandings = useCallback(async () => {
    abortRefs.current.standings?.abort();
    const controller = new AbortController();
    abortRefs.current.standings = controller;
    try {
      const data = await fetcher<{ standings: StandingGroup[] }>('/api/standings', controller.signal);
      // Keep only TOTAL rows (not HOME/AWAY split rows).
      const total = data.standings.filter(s => s.type === 'TOTAL');
      setStandingGroups(total);
      setAllEntries(total.flatMap(s => s.table));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
    }
  }, []);

  const fetchScorers = useCallback(async () => {
    abortRefs.current.scorers?.abort();
    const controller = new AbortController();
    abortRefs.current.scorers = controller;
    try {
      const data = await fetcher<{ scorers: Scorer[] }>('/api/scorers', controller.signal);
      setScorers(data.scorers);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      // Non-fatal — scorers panel will just be empty.
      console.warn('Scorers fetch failed:', e);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    Promise.all([fetchStandings(), fetchMatches(), fetchScorers()]).finally(() =>
      setIsLoading(false)
    );
  }, []);

  // Set up polling intervals.
  useEffect(() => {
    const matchTimer    = setInterval(fetchMatches,   MATCHES_INTERVAL);
    const standTimer    = setInterval(fetchStandings, STANDINGS_INTERVAL);
    const scorersTimer  = setInterval(fetchScorers,   SCORERS_INTERVAL);

    return () => {
      clearInterval(matchTimer);
      clearInterval(standTimer);
      clearInterval(scorersTimer);
      abortRefs.current.matches?.abort();
      abortRefs.current.standings?.abort();
      abortRefs.current.scorers?.abort();
    };
  }, [fetchMatches, fetchStandings, fetchScorers]);

  return { standingGroups, allEntries, matches, scorers, lastUpdated, isLoading, error };
}
