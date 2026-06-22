import { Match } from '../types';
import { matchesCountry } from '../utils/helpers';

interface Props {
  country: string;
  liveMatch: Match | null;
}

export function LiveIndicator({ country, liveMatch }: Props) {
  if (!liveMatch) return null;

  const isHome = matchesCountry(country, liveMatch.homeTeam.name);
  const hs = liveMatch.score.fullTime.home;
  const as = liveMatch.score.fullTime.away;
  const scoreStr = hs !== null && as !== null ? `${hs}–${as}` : 'LIVE';
  const opp = isHome ? liveMatch.awayTeam.name : liveMatch.homeTeam.name;
  const isPaused = liveMatch.status === 'PAUSED';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span
        className={`h-2.5 w-2.5 rounded-full bg-red-500 ${isPaused ? '' : 'animate-live-pulse'}`}
        title={isPaused ? 'Half-time' : 'Live'}
      />
      <span className="text-red-500 dark:text-red-400">
        {scoreStr} vs {opp}
        {isPaused ? ' (HT)' : ''}
      </span>
    </span>
  );
}
