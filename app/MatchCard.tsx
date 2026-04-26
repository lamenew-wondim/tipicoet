import Link from 'next/link';
import { OddsValues } from '../lib/odds';

/**
 * MatchCard - Pure UI Component
 * 
 * This component is now purely responsible for rendering.
 * All data fetching and polling is handled by parent pages
 * (fixtures/page.tsx or live/page.tsx) to ensure efficient API usage.
 */
export default function MatchCard({
  match,
  odds,
}: {
  match: any;
  odds?: OddsValues | null;
}) {
  const isLive =
    match.fixture.status.short === '1H' ||
    match.fixture.status.short === '2H' ||
    match.fixture.status.short === 'HT';

  const statusShort = match.fixture.status.short;

  const getStatusLabel = () => {
    if (statusShort === 'NS') return 'Scheduled';
    if (statusShort === 'HT') return 'Break';
    if (statusShort === '1H') return '1 Half';
    if (statusShort === '2H') return '2 Half';
    if (statusShort === 'FT') return 'Finished';
    return statusShort;
  };

  const lockIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.6 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );

  const display = (key: keyof OddsValues) => {
    if (!odds || !odds[key]) return isLive ? lockIcon : '-';
    return odds[key];
  };

  const targetUrl = isLive
    ? `/match/${match.fixture.id}?live=true`
    : `/match/${match.fixture.id}`;

  return (
    <Link href={targetUrl} className="match-row">
      {/* Top Status Bar */}
      <div className="match-status-row">
        {isLive && <div className="status-dot"></div>}
        <span style={{ color: isLive ? '#28a745' : '#6c757d' }}>{getStatusLabel()}</span>
        {isLive && <span>{match.fixture.status.elapsed}'</span>}
        {!isLive && statusShort === 'NS' && (
          <span>
            {new Date(match.fixture.date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      <div className="match-main-row">
        {/* Teams and Scores */}
        <div className="match-teams-scores">
          <div className="team-score-line">
            <img src={match.teams.home.logo} className="team-logo-small" alt="" />
            <span className="team-name-text">{match.teams.home.name}</span>
            <div className="score-display">
              <span className="main-score">{match.goals.home ?? 0}</span>
              <span className="ht-score">{match.score.halftime.home ?? 0}</span>
              <span className="ht-score">0</span> {/* Third col in screenshot */}
            </div>
          </div>
          <div className="team-score-line">
            <img src={match.teams.away.logo} className="team-logo-small" alt="" />
            <span className="team-name-text">{match.teams.away.name}</span>
            <div className="score-display">
              <span className="main-score">{match.goals.away ?? 0}</span>
              <span className="ht-score">{match.score.halftime.away ?? 0}</span>
              <span className="ht-score">0</span>
            </div>
          </div>
        </div>

        {/* Extra Markets Count */}
        <div className="extra-markets-badge">
          +{Math.floor(Math.random() * 350) + 100}
        </div>

        {/* Odds Row */}
        <div className="odds-row" onClick={e => e.preventDefault()}>
          <div className="odd-tile">
            <span className="odd-lbl">1</span>
            <span>{display('home')}</span>
          </div>
          <div className="odd-tile">
            <span className="odd-lbl">X</span>
            <span>{display('draw')}</span>
          </div>
          <div className="odd-tile">
            <span className="odd-lbl">2</span>
            <span>{display('away')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
