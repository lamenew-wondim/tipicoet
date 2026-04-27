'use client';
import { useEffect, useState, Suspense } from 'react';
import MatchCard from '../MatchCard';
import { useSearchParams } from 'next/navigation';
import PopularEvents from '../PopularEvents';
import { extractBestOdds, OddsValues } from '../../lib/odds';
import Link from 'next/link';


function LiveContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams?.get('league');
  
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [visibleMatches, setVisibleMatches] = useState<any[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<number, OddsValues>>({});
  
  const [loading, setLoading] = useState(true);
   const [oddsChecking, setOddsChecking] = useState(false);
   const urlQuery = searchParams?.get('q') || '';
   const [searchQuery, setSearchQuery] = useState(urlQuery);
   const [allLeagues, setAllLeagues] = useState<any[]>([]);

   // Sync with URL (sidebar search)
   useEffect(() => {
     setSearchQuery(urlQuery);
   }, [urlQuery]);

   // Fetch leagues once for search discovery
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

  const fetchLive = () => {
    // 1. Strict Polling Control: Stop if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) return;

    setLoading(allMatches.length === 0); // Only show loader on initial fetch
    setOddsChecking(false);
    
    fetch(`/api/football/live${leagueId ? `?league=${leagueId}` : ''}`)
      .then(res => res.json())
      .then(async data => {
        const fixtureList: any[] = data.response || [];
        setAllMatches(fixtureList);
        setLoading(false);
        
        // 2. Filter: only show matches that are actually live (in-play)
        const liveMatches = fixtureList.filter(m => {
          const s = m.fixture.status.short;
          return s === '1H' || s === '2H' || s === 'HT';
        });

        if (liveMatches.length === 0) {
          setVisibleMatches([]);
          setOddsChecking(false);
          return;
        }

        setOddsChecking(true);

        /**
         * OPTIMIZATION: Bulk Live Odds Fetch
         * Instead of fetching odds for every fixture individually, we fetch by league.
         */
        try {
          // Fix: only fetch bulk live odds if leagueId is a valid number
          const oddsUrl = (leagueId && !isNaN(parseInt(leagueId)))
            ? `/api/football/odds/live?league=${leagueId}`
            : null;

          if (oddsUrl) {
            const odRes = await fetch(oddsUrl);
            const odData = await odRes.json();
            
            const newMap: Record<number, OddsValues> = {};
            
            if (odData.response && Array.isArray(odData.response)) {
              odData.response.forEach((item: any) => {
                const best = extractBestOdds(item);
                if (best) newMap[item.fixture.id] = best;
              });
            }
            setOddsMap(prev => ({ ...prev, ...newMap }));
          }
          
          setVisibleMatches(liveMatches);
         } catch (err) {
           console.error("Live bulk odds fetch failed:", err);
           setVisibleMatches(liveMatches);
         }

        setOddsChecking(false);
      })
      .catch((err) => {
        console.error("Live fetch error:", err);
        setLoading(false);
        setOddsChecking(false);
      });
  };

  useEffect(() => {
    fetchLive();

    // 3. Visibility API: Refresh immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchLive();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh every 45-60s
    const interval = setInterval(fetchLive, 60000); 

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [leagueId]);

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

  return (
    <div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Live In-Play</h1>
          {oddsChecking && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Updating Odds...</span>}
        </div>
        <div className="search-bar" style={{ width: 280, margin: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search live teams..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: 13 }} 
          />
        </div>
      </div>

      {visibleMatches.length === 0 && !loading && (
        <div className="error-msg">
          No live matches available at the moment {searchQuery ? `matching "${searchQuery}"` : (leagueId ? `for League ${leagueId}` : '')}.
        </div>
      )}
      
      {visibleMatches.length > 0 && !searchQuery && (
        <div className="league-bar">
          <span>⚽ {leagueId ? (visibleMatches[0]?.league?.name || 'Live Events') : 'Live Events'}</span>
          <div className="league-headers">
            <span className="header-lbl">1</span>
            <span className="header-lbl">X</span>
            <span className="header-lbl">2</span>
          </div>
        </div>
      )}

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
              <span>⚽ {filteredMatches.length > 0 ? `Matching Live Matches for "${searchQuery}"` : `No live matches found for "${searchQuery}"`}</span>
           </div>
         </div>
       )}
      <div style={{ background: '#f0f2f5', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {filteredMatches.map(m => (
          <MatchCard 
            key={m.fixture.id} 
            match={m} 
            odds={oddsMap[m.fixture.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<div className="loader"></div>}>
      <LiveContent />
    </Suspense>
  )
}
