'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import MatchCard from '../MatchCard';
import { useSearchParams } from 'next/navigation';
import PopularEvents from '../PopularEvents';
import { extractBestOdds, OddsValues } from '../../lib/odds';

// Leagues to prioritize on the landing page (in display order)
const PRIORITY_LEAGUES = [
  { id: 140, name: 'Spain. La Liga' },
  { id: 135, name: 'Italy. Serie A' },
  { id: 39, name: 'England. Premier League' },
  { id: 78, name: 'Germany. Bundesliga' },
  { id: 61, name: 'France. Ligue 1' },
  { id: 2, name: 'UEFA Champions League' },
  { id: 3, name: 'UEFA Europa League' },
  { id: 848, name: 'UEFA Europa Conference League' },
  { id: 94, name: 'Portugal. Primeira Liga' },
  { id: 88, name: 'Netherlands. Eredivisie' },
];

// Collapsible league group component
function LeagueGroup({ leagueId, leagueName, leagueLogo, country, matches, oddsMap }: {
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  country: string;
  matches: any[];
  oddsMap: Record<number, OddsValues>;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ marginBottom: 2 }}>
      {/* League header row */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--accent)',
          padding: '8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: isOpen ? '6px 6px 0 0' : '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={leagueLogo}
            alt={leagueName}
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain', background: 'rgba(0,0,0,0.2)', padding: 1 }}
          />
          <Link
            href={`/fixtures?league=${leagueId}`}
            onClick={e => e.stopPropagation()}
            style={{ color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
          >
            Football. {country}. {leagueName}
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>1</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>X</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>2</span>
          <svg
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s', opacity: 0.9 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {/* Match rows */}
      {isOpen && (
        <div style={{ borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
          {matches.map(m => (
            <MatchCard
              key={m.fixture.id}
              match={m}
              odds={oddsMap[m.fixture.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function FixturesContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams?.get('league');
  const daysFilter = searchParams?.get('days') || '7';

  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [visibleMatches, setVisibleMatches] = useState<any[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<number, OddsValues>>({});
  const [loading, setLoading] = useState(true);
  const [oddsChecking, setOddsChecking] = useState(false);
  const urlQuery = searchParams?.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [allLeagues, setAllLeagues] = useState<any[]>([]);

  // Sync with URL
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  // Fetch leagues once for search
  useEffect(() => {
    fetch('/api/football/leagues')
      .then(res => res.json())
      .then(data => {
        const list = data.response?.map((l: any) => ({
          id: l.league.id,
          name: `${l.country.name}. ${l.league.name}`,
          logo: l.country.flag || l.league.logo
        })) || [];
        setAllLeagues(list);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setOddsChecking(false);
    setAllMatches([]);
    setVisibleMatches([]);
    setOddsMap({});

    const currentYear = new Date().getFullYear();

    // Landing page: fetch from all priority leagues in parallel
    if (!leagueId && !searchQuery) {
      const leagueIds = PRIORITY_LEAGUES.map(l => l.id);
      Promise.all(
        leagueIds.map(id =>
          fetch(`/api/football/fixtures?days=${daysFilter}&league=${id}`)
            .then(r => r.json())
            .catch(() => ({ response: [] }))
        )
      ).then(async results => {
        const fixtureList = results.flatMap(r => r.response || []);
        setAllMatches(fixtureList);
        setLoading(false);

        if (fixtureList.length === 0) return;
        setOddsChecking(true);

        // Fetch odds for each priority league
        const oddsResults = await Promise.allSettled(
          leagueIds.map(id => {
            const fIds = fixtureList.filter(f => f.league?.id === id).map(f => f.fixture.id).join(',');
            if (!fIds) return Promise.resolve({ value: { odds: {} } });
            return fetch(`/api/football/odds/bulk?ids=${fIds}`).then(r => r.json());
          })
        );

        const mergedOddsMap: Record<number, OddsValues> = {};
        oddsResults.forEach(res => {
          if (res.status === 'fulfilled' && res.value?.odds) {
            Object.assign(mergedOddsMap, res.value.odds);
          }
        });

        setOddsMap(mergedOddsMap);
        // Show all fixtures (not just ones with odds) on landing page
        setVisibleMatches(fixtureList);
        setOddsChecking(false);
      });
      return;
    }

    const fetchUrl = searchQuery
      ? `/api/football/fixtures?days=7`
      : `/api/football/fixtures?days=${daysFilter}${leagueId ? `&league=${leagueId}` : ''}`;

    fetch(fetchUrl)
      .then(res => res.json())
      .then(async (data) => {
        const fixtureList: any[] = data.response || [];
        setAllMatches(fixtureList);
        setLoading(false);

        if (fixtureList.length === 0) return;
        setOddsChecking(true);

        if (leagueId) {
          try {
            const fIds = fixtureList.map(f => f.fixture.id).join(',');
            const oddsRes = await fetch(`/api/football/odds/bulk?ids=${fIds}`);
            const oddsData = await oddsRes.json();
            if (oddsData.odds) setOddsMap(oddsData.odds);
            setVisibleMatches(fixtureList);
          } catch (err) {
            console.error('Failed to fetch bulk odds:', err);
            setVisibleMatches(fixtureList);
          }
        } else {
          // search mode
          try {
            const leagueCounts: Record<string, number> = {};
            fixtureList.forEach(f => {
              const lId = f.league?.id;
              if (lId) {
                leagueCounts[lId] = (leagueCounts[lId] || 0) + 1;
              }
            });
            const topLeagues = Object.keys(leagueCounts).sort((a, b) => leagueCounts[b] - leagueCounts[a]).slice(0, 15);
            const promises = topLeagues.map(lId => {
              const fIds = fixtureList.filter(f => f.league?.id === Number(lId)).map(f => f.fixture.id).join(',');
              if (!fIds) return Promise.resolve({ odds: {} });
              return fetch(`/api/football/odds/bulk?ids=${fIds}`).then(r => r.json());
            });
            const results = await Promise.allSettled(promises);
            const mergedOddsMap: Record<number, OddsValues> = {};
            results.forEach(res => {
              if (res.status === 'fulfilled' && res.value?.odds) Object.assign(mergedOddsMap, res.value.odds);
            });
            setOddsMap(mergedOddsMap);
            setVisibleMatches(fixtureList);
          } catch (err) {
            console.error('Top leagues odds fetch failed', err);
            setVisibleMatches(fixtureList);
          }
        }

        setOddsChecking(false);
      })
      .catch((err) => {
        console.error('Fixtures fetch error:', err);
        setLoading(false);
        setOddsChecking(false);
      });
  }, [leagueId, daysFilter, searchQuery]);

  const filteredMatches = visibleMatches.filter(m => {
    const q = searchQuery.toLowerCase();
    return (m.teams?.home?.name?.toLowerCase().includes(q)) ||
      (m.teams?.away?.name?.toLowerCase().includes(q)) ||
      (m.league?.name?.toLowerCase().includes(q));
  });

  const filteredLeagues = searchQuery.length >= 2
    ? allLeagues.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : [];

  if (loading && visibleMatches.length === 0) return <div className="loader"></div>;

  // Group matches by league for the landing page view
  const isLandingPage = !leagueId && !searchQuery;
  const groupedByLeague: Record<number, any[]> = {};
  if (isLandingPage) {
    filteredMatches.forEach(m => {
      const lid = m.league?.id;
      if (!groupedByLeague[lid]) groupedByLeague[lid] = [];
      groupedByLeague[lid].push(m);
    });
  }

  // Order groups by PRIORITY_LEAGUES order, then others
  const priorityIds = PRIORITY_LEAGUES.map(l => l.id);
  const orderedLeagueIds = [
    ...priorityIds.filter(id => groupedByLeague[id]?.length > 0),
    ...Object.keys(groupedByLeague).map(Number).filter(id => !priorityIds.includes(id))
  ];

  return (
    <div>
      {!leagueId && !searchQuery && <PopularEvents />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Pre-Match</h1>
        <div className="search-bar" style={{ width: 280, margin: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Search teams or leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: 13 }}
          />
        </div>
      </div>

      {visibleMatches.length === 0 && !loading && (
        <div className="error-msg">
          No upcoming matches found for{' '}
          {searchQuery ? `"${searchQuery}"` : (leagueId ? (allMatches[0]?.league?.name || `League ${leagueId}`) : 'this category')}.
        </div>
      )}

      {/* SEARCH RESULTS */}
      {searchQuery && (
        <div className="search-results-container" style={{ marginBottom: 24 }}>
          {filteredLeagues.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="league-bar" style={{ background: '#222', marginBottom: 8 }}>
                <span>🏆 Matching Leagues</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filteredLeagues.map(l => (
                  <Link key={l.id} href={`/fixtures?league=${l.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 6, textDecoration: 'none', color: 'white', fontSize: 13, border: '1px solid #333' }}>
                    <img src={l.logo} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                    {l.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="league-bar" style={{ background: 'var(--bg-main)', borderBottom: '1px solid #333' }}>
            <span>⚽ {filteredMatches.length > 0 ? `Matching Matches for "${searchQuery}"` : `No matches found for "${searchQuery}"`}</span>
          </div>
        </div>
      )}

      {/* LANDING PAGE: Grouped by league */}
      {isLandingPage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {orderedLeagueIds.map(lid => {
            const matches = groupedByLeague[lid];
            if (!matches?.length) return null;
            const sample = matches[0];
            return (
              <LeagueGroup
                key={lid}
                leagueId={lid}
                leagueName={sample.league?.name || ''}
                leagueLogo={sample.league?.logo || ''}
                country={sample.league?.country || ''}
                matches={matches}
                oddsMap={oddsMap}
              />
            );
          })}
        </div>
      )}

      {/* SINGLE LEAGUE VIEW */}
      {!isLandingPage && !searchQuery && visibleMatches.length > 0 && (
        <>
          <div className="league-bar">
            <span>⚽ {leagueId ? (visibleMatches[0]?.league?.name || `League ${leagueId}`) : 'Upcoming Events'}</span>
            <div className="league-headers">
              <span className="header-lbl">1</span>
              <span className="header-lbl">X</span>
              <span className="header-lbl">2</span>
            </div>
          </div>
          <div style={{ borderRadius: 8, overflow: 'hidden' }}>
            {filteredMatches.map(m => (
              <MatchCard key={m.fixture.id} match={m} odds={oddsMap[m.fixture.id] ?? null} />
            ))}
          </div>
        </>
      )}

      {/* SEARCH RESULTS MATCHES */}
      {searchQuery && (
        <div style={{ borderRadius: 8, overflow: 'hidden' }}>
          {filteredMatches.map(m => (
            <MatchCard key={m.fixture.id} match={m} odds={oddsMap[m.fixture.id] ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FixturesPage() {
  return (
    <Suspense fallback={<div className="loader"></div>}>
      <FixturesContent />
    </Suspense>
  );
}
