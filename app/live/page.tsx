'use client';
import { useEffect, useState, Suspense } from 'react';
import MatchCard from '../MatchCard';
import { useSearchParams } from 'next/navigation';
import PopularEvents from '../PopularEvents';
import { extractBestOdds, OddsValues } from '../../lib/odds';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';


// Simple global cache to preserve live data on back navigation
let liveMatchesCache: any[] = [];
let liveOddsCache: Record<number, OddsValues> = {};

function LiveContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams?.get('league');
  
  const [allMatches, setAllMatches] = useState<any[]>(liveMatchesCache);
  const [visibleMatches, setVisibleMatches] = useState<any[]>(liveMatchesCache);
  const [oddsMap, setOddsMap] = useState<Record<number, OddsValues>>(liveOddsCache);
  
  const [loading, setLoading] = useState(liveMatchesCache.length === 0);
  const [oddsChecking, setOddsChecking] = useState(false);
  const urlQuery = searchParams?.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [allLeagues, setAllLeagues] = useState<any[]>([]);

  // Sync with URL (sidebar search)
  useEffect(() => {
    setSearchQuery(urlQuery);
    setLocalSearch(urlQuery);
  }, [urlQuery]);

  const [localSearch, setLocalSearch] = useState(urlQuery);

  useEffect(() => {
    setSearchQuery(localSearch);
  }, [localSearch]);

  // Fetch leagues once for search discovery (from Firestore)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'leagues_list'), (snap) => {
      if (snap.exists()) {
        setAllLeagues(snap.data().leagues || []);
      }
    });
    return () => unsub();
  }, []);

  // REAL-TIME FIRESTORE SYNC
  useEffect(() => {
    const qLive = collection(db, 'live_matches');
    
    setLoading(allMatches.length === 0);
    
    // 1. Listen to Live Matches
    const unsubscribeLive = onSnapshot(qLive, (snapshot) => {
      const matches = snapshot.docs.map(doc => doc.data());
      setAllMatches(matches);
      
      // Filter only matches in-play (1H, 2H, HT)
      const filtered = matches.filter(m => {
        const s = m.fixture?.status?.short;
        return s === '1H' || s === '2H' || s === 'HT';
      });
      
      setVisibleMatches(filtered);
      liveMatchesCache = filtered;
      setLoading(false);
    });

    // 2. Listen to Odds
    const qOdds = collection(db, 'odds');
    const unsubscribeOdds = onSnapshot(qOdds, (snapshot) => {
      const newMap: Record<number, OddsValues> = {};
      snapshot.docs.forEach(doc => {
        const best = extractBestOdds(doc.data());
        if (best) newMap[Number(doc.id)] = best;
      });
      setOddsMap(newMap);
      liveOddsCache = newMap;
    });

    return () => {
      unsubscribeLive();
      unsubscribeOdds();
    };
  }, [leagueId]);

  const filteredMatches = visibleMatches.filter(m => {
    const q = localSearch.toLowerCase();
    return (m.teams?.home?.name?.toLowerCase().includes(q)) || 
           (m.teams?.away?.name?.toLowerCase().includes(q)) ||
           (m.league?.name?.toLowerCase().includes(q));
  });

  const filteredLeagues = searchQuery.length >= 2 
    ? allLeagues.filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
    : [];



  return (
    <div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: 18, whiteSpace: 'nowrap' }}>Live In-Play</h1>
          {oddsChecking && <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>Updating...</span>}
        </div>
        <div className="search-bar" style={{ flex: 1, maxWidth: 220, margin: 0, minWidth: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search live teams..." 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: 13 }} 
          />
        </div>
      </div>

      {loading && visibleMatches.length === 0 ? (
        <div className="loader"></div>
      ) : visibleMatches.length === 0 && !loading && (
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
