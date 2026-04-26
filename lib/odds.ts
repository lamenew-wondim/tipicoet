export interface OddsValues {
  home: string | null;
  draw: string | null;
  away: string | null;
}

/**
 * Extracts the best possible 1x2 (Match Winner/Fulltime Result) odds from an API-Sports odds response.
 * It scans all bookmakers and markets to combine odds if necessary, prioritizing valid, non-suspended values.
 *
 * @param leagueData The odds object from the API response (e.g., data.response[0])
 * @returns OddsValues containing {home, draw, away} or null if no valid odds are found.
 */
export function extractBestOdds(leagueData: any): OddsValues | null {
  if (!leagueData) return null;

  const result: OddsValues = { home: null, draw: null, away: null };
  const targetNames = ['Match Winner', 'Fulltime Result', '1x2'];
  const targetIds = [1, 59];

  // Helper to process a list of bets and update result
  const processBets = (bets: any[]) => {
    if (!Array.isArray(bets)) return;
    
    for (const bet of bets) {
      if (targetNames.includes(bet.name) || targetIds.includes(bet.id)) {
        if (!Array.isArray(bet.values)) continue;
        
        for (const v of bet.values) {
          if (v.suspended === true) continue;
          
          if (!result.home && v.value === 'Home' && v.odd) {
            result.home = String(v.odd);
          }
          if (!result.draw && (v.value === 'Draw' || v.value === 'X') && v.odd) {
            result.draw = String(v.odd);
          }
          if (!result.away && v.value === 'Away' && v.odd) {
            result.away = String(v.odd);
          }
        }
      }
      
      // Early exit if we found all three values
      if (result.home && result.draw && result.away) return;
    }
  };

  // 1. Live odds structure: leagueData.odds -> array of bets
  if (leagueData.odds && Array.isArray(leagueData.odds)) {
    processBets(leagueData.odds);
  }

  // 2. Pre-match structure: leagueData.bookmakers -> array of bookmakers with bets
  if (leagueData.bookmakers && Array.isArray(leagueData.bookmakers)) {
    for (const bm of leagueData.bookmakers) {
      if (result.home && result.draw && result.away) break;
      processBets(bm.bets);
    }
  }

  // If we didn't find any valid odds at all, return null
  if (!result.home && !result.draw && !result.away) {
    console.warn(`[Odds Extractor] No valid 1x2 odds found. Target fixture odds data might be missing or suspended.`, {
      leagueData: JSON.stringify(leagueData).substring(0, 200) + '...' // Log snippet for debugging
    });
    return null;
  }

  return result;
}
