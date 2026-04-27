'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getPopularMatches, TOP_LEAGUES } from '../lib/popularity';

/**
 * PopularEvents - Advanced Trending Slider
 * Fetches specifically from top leagues to ensure correct tracking and diversity.
 */
export default function PopularEvents() {
  const [matches, setMatches] = useState<any[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTrendingWithOdds = async () => {
      setLoading(true);
      try {
        // 1. Fetch live matches first (always top priority)
        const liveRes = await fetch('/api/football/live');
        if (!liveRes.ok) throw new Error('Live fetch failed');
        const liveData = await liveRes.json();
        const livePool = liveData.response || [];

        // 2. Fetch upcoming fixtures from TOP LEAGUES specifically to ensure they are tracked.
        const focusLeagues = [39, 140, 78, 135, 61, 2, 3]; 
        
        const fixturesPromises = focusLeagues.map(id => 
          fetch(`/api/football/fixtures?days=7&league=${id}`)
            .then(res => res.ok ? res.json() : { response: [] })
            .catch(() => ({ response: [] }))
        );
        
        const fixturesResults = await Promise.all(fixturesPromises);
        const fixturesPool = fixturesResults.flatMap(res => res.response || []);

        const combined = [...livePool, ...fixturesPool];

        // Rank a wider pool first, then enforce UI mix rules:
        // - Show up to 10 total
        // - At most 5 live
        // - Fill the rest with pre-match fixtures
        const rankedPool = getPopularMatches(combined, 40);
        const isLiveMatch = (m: any) => {
          const nonLive = ['NS', 'FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO', 'TBD'];
          return !nonLive.includes(m?.fixture?.status?.short);
        };

        const liveMatches = rankedPool.filter(isLiveMatch);
        const preMatchMatches = rankedPool.filter((m) => !isLiveMatch(m));

        const selectedLive = liveMatches.slice(0, 5);
        const slotsLeft = Math.max(0, 10 - selectedLive.length);
        const selectedPreMatch = preMatchMatches.slice(0, slotsLeft);

        const trending = [...selectedLive, ...selectedPreMatch];
        setMatches(trending);

        // 4. Fetch real odds for these specific matches
        const fixtureIds = trending.map(m => m.fixture.id).join(',');
        if (fixtureIds) {
          const oddsRes = await fetch(`/api/football/odds/bulk?ids=${fixtureIds}`);
          const oddsData = await oddsRes.json();
          setOddsMap(oddsData.odds || {});
        }
      } catch (err) {
        console.error("PopularEvents fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingWithOdds();
  }, []);

  if (loading || matches.length === 0) return null;

  return (
    <div className="popular-slider-section">
      <div className="popular-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>Popular Events</span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => {
           if (scrollRef.current) scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
        }} className="slider-nav-btn prev">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button onClick={() => {
           if (scrollRef.current) scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
        }} className="slider-nav-btn next">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <div className="popular-track" ref={scrollRef}>
        {matches.map((m) => {
          const isLive =
            m.fixture.status.short === '1H' ||
            m.fixture.status.short === '2H' ||
            m.fixture.status.short === 'HT';

          const matchOdds = oddsMap[m.fixture.id];
          const matchDate = new Date(m.fixture.date);
          const isToday = matchDate.toDateString() === new Date().toDateString();
          
          const getVal = (key: 'home' | 'draw' | 'away') => {
            if (!matchOdds || !matchOdds[key]) return 'N/A';
            return matchOdds[key];
          };

          return (
            <Link key={m.fixture.id} href={`/match/${m.fixture.id}`} className="popular-event-card">
              <div className="popular-card-body">
                <div className="card-top-badges">
                  {isLive ? (
                    <div className="live-badge" style={{ background: '#ff3b5c', color: 'white' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: 4 }}>
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                        <circle cx="12" cy="13" r="2"></circle>
                      </svg>
                      LIVE
                    </div>
                  ) : (
                    <div className="time-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} {!isToday && matchDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div className="popular-star">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                </div>

                <div className="logo-vs-row">
                  <div className="team-logo-circle">
                    <img src={m.teams.home.logo} alt="" />
                  </div>
                  <div className="vs-score-box">
                    {isLive ? (
                      <>
                        <span>{m.goals.home ?? 0}</span>
                        <span className="vs-text" style={{ margin: '0 6px', opacity: 0.5 }}>:</span>
                        <span>{m.goals.away ?? 0}</span>
                      </>
                    ) : (
                      <span className="vs-text">VS</span>
                    )}
                  </div>
                  <div className="team-logo-circle">
                    <img src={m.teams.away.logo} alt="" />
                  </div>
                </div>

                <div className="popular-info-area">
                  <div className="popular-league-text">
                    <img src={m.league.logo} style={{ width: 14, height: 14, borderRadius: '50%' }} alt="" />
                    <span>Football. {m.league.name}</span>
                  </div>
                  <div className="popular-teams-text">
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.teams.home.name}</div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.teams.away.name}</div>
                  </div>
                </div>

                <div className="popular-odds-footer">
                  <div className="pop-odds-row">
                    <div className="pop-tile">
                      <span>1</span>
                      <span>{getVal('home')}</span>
                    </div>
                    <div className="pop-tile">
                      <span>X</span>
                      <span>{getVal('draw')}</span>
                    </div>
                    <div className="pop-tile highlight">
                      <span>2</span>
                      <span>{getVal('away')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-orange-footer">
                +{m.fixture.id % 2000 + 300}
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </div>
  );
}
