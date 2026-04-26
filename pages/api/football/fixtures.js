import { fetchFootball } from "../../../lib/apiFootball";

export default async function handler(req, res) {
  const { league, days = 7 } = req.query;
  const d = parseInt(days) || 7;
  const nextLimit = league ? Math.min(d * 10, 99) : 99;

  let currentSeason = new Date().getFullYear();

  try {
    if (league) {
      // Optimization: Only fetch the specific league data to get the current season
      const leagueData = await fetchFootball(`/leagues?id=${league}`);
      const leagueInfo = leagueData.response?.find(l => l.league.id === parseInt(league));
      if (leagueInfo) {
        currentSeason = leagueInfo.seasons?.find(s => s.current)?.year || currentSeason;
      } else if (currentSeason > 2024) {
        currentSeason = 2025;
      }

      const endpoint = `/fixtures?league=${league}&season=${currentSeason}&next=${nextLimit}`;
      const data = await fetchFootball(endpoint, 600); // 10 minutes cache

      if (data.error) {
        return res.status(500).json(data);
      }

      if (data.response && Array.isArray(data.response)) {
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(now.getDate() + d);

        data.response = data.response.filter(f => {
          const gameDate = new Date(f.fixture.date);
          return gameDate <= limitDate;
        });
      }

      return res.status(200).json(data);

    } else {
      // NO LEAGUE SPECIFIED (Landing Page)
      // Fetch upcoming games for Top Leagues to populate the landing page
      const focusLeagues = [39, 140, 78, 135, 61, 2, 3]; // PL, La Liga, Bund, SerieA, Ligue1, UCL, UEL

      const promises = focusLeagues.map(id => {
        return fetchFootball(`/fixtures?league=${id}&season=2025&next=10`, 600).catch(() => ({ response: [] }));
      });

      const results = await Promise.all(promises);
      let combinedFixtures = [];

      results.forEach(result => {
        if (result && result.response && Array.isArray(result.response)) {
          combinedFixtures = combinedFixtures.concat(result.response);
        }
      });

      // Filter by date
      const now = new Date();
      const limitDate = new Date();
      limitDate.setDate(now.getDate() + d);

      combinedFixtures = combinedFixtures.filter(f => {
        const gameDate = new Date(f.fixture.date);
        return gameDate <= limitDate;
      });

      // Sort by date so they appear chronologically
      combinedFixtures.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

      return res.status(200).json({
        get: "fixtures",
        parameters: req.query,
        errors: [],
        results: combinedFixtures.length,
        response: combinedFixtures
      });
    }
  } catch (error) {
    console.error("Fixtures route error:", error);
    return res.status(500).json({ error: true, message: 'Failed to fetch fixtures' });
  }
}
